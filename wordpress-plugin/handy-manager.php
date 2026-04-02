<?php
/**
 * Plugin Name: Handy Manager
 * Description: Remote WordPress management API for Handy-Subs system. Enables secure remote update checks and auto-updates.
 * Version: 1.0.0
 * Author: Handy-Subs
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) {
    exit;
}

class Handy_Manager {

    private $option_key = 'handy_manager_secret_key';

    public function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('rest_api_init', [$this, 'add_cors_headers'], 15);
    }

    /**
     * Add CORS headers so the Handy-Subs app can call this API from the browser
     */
    public function add_cors_headers() {
        // Handle preflight OPTIONS requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: X-Handy-Secret, Content-Type, Accept');
            header('Access-Control-Max-Age: 86400');
            status_header(200);
            exit;
        }

        // Add CORS headers to all REST API responses
        remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
        add_filter('rest_pre_serve_request', function ($value) {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: X-Handy-Secret, Content-Type, Accept');
            return $value;
        });
    }

    /**
     * Register REST API routes
     */
    public function register_routes() {
        register_rest_route('handy-manager/v1', '/status', [
            'methods'  => 'GET',
            'callback' => [$this, 'get_status'],
            'permission_callback' => [$this, 'verify_secret'],
        ]);

        register_rest_route('handy-manager/v1', '/update', [
            'methods'  => 'POST',
            'callback' => [$this, 'run_updates'],
            'permission_callback' => [$this, 'verify_secret'],
        ]);
    }

    /**
     * Verify the secret key from request header
     */
    public function verify_secret($request) {
        $secret = $request->get_header('X-Handy-Secret');
        if (empty($secret)) {
            $secret = $request->get_param('secret');
        }
        $stored_secret = get_option($this->option_key, '');
        if (empty($stored_secret) || !hash_equals($stored_secret, $secret)) {
            return new WP_Error('unauthorized', 'Invalid or missing secret key.', ['status' => 401]);
        }
        return true;
    }

    /**
     * GET /status - Return available updates
     */
    public function get_status($request) {
        require_once ABSPATH . 'wp-admin/includes/update.php';
        require_once ABSPATH . 'wp-admin/includes/plugin.php';

        // Force WordPress to check for updates
        wp_update_plugins();
        wp_update_themes();
        wp_version_check();

        $update_plugins = get_site_transient('update_plugins');
        $update_themes  = get_site_transient('update_themes');
        $update_core    = get_site_transient('update_core');

        // Core update info
        $core_update = false;
        $core_version = get_bloginfo('version');
        if (!empty($update_core->updates)) {
            foreach ($update_core->updates as $update) {
                if ($update->response === 'upgrade') {
                    $core_update = $update->current;
                    break;
                }
            }
        }

        // Plugin updates
        $plugins_needing_update = [];
        if (!empty($update_plugins->response)) {
            foreach ($update_plugins->response as $plugin_file => $plugin_data) {
                $all_plugins = get_plugins();
                $name = isset($all_plugins[$plugin_file]) ? $all_plugins[$plugin_file]['Name'] : $plugin_file;
                $plugins_needing_update[] = [
                    'file'        => $plugin_file,
                    'name'        => $name,
                    'current'     => isset($all_plugins[$plugin_file]) ? $all_plugins[$plugin_file]['Version'] : 'unknown',
                    'new_version' => $plugin_data->new_version,
                ];
            }
        }

        // Theme updates
        $themes_needing_update = [];
        if (!empty($update_themes->response)) {
            foreach ($update_themes->response as $theme_slug => $theme_data) {
                $theme = wp_get_theme($theme_slug);
                $themes_needing_update[] = [
                    'slug'        => $theme_slug,
                    'name'        => $theme->get('Name'),
                    'current'     => $theme->get('Version'),
                    'new_version' => $theme_data['new_version'],
                ];
            }
        }

        return rest_ensure_response([
            'success'        => true,
            'site_url'       => get_site_url(),
            'wp_version'     => $core_version,
            'core_update'    => $core_update,
            'plugins_count'  => count($plugins_needing_update),
            'themes_count'   => count($themes_needing_update),
            'plugins'        => $plugins_needing_update,
            'themes'         => $themes_needing_update,
            'php_version'    => phpversion(),
            'checked_at'     => gmdate('c'),
        ]);
    }

    /**
     * POST /update - Run updates
     * Body: { "type": "all" | "core" | "plugins" | "themes", "items": ["plugin-file.php"] }
     */
    public function run_updates($request) {
        // Increase time limit for bulk updates
        if (function_exists('set_time_limit')) {
            set_time_limit(300);
        }

        require_once ABSPATH . 'wp-admin/includes/update.php';
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/misc.php';
        require_once ABSPATH . 'wp-admin/includes/theme.php';

        // Allow filesystem access without FTP credentials
        if (!defined('FS_METHOD')) {
            define('FS_METHOD', 'direct');
        }

        $type  = $request->get_param('type') ?: 'all';
        $items = $request->get_param('items') ?: [];
        $results = ['core' => null, 'plugins' => [], 'themes' => []];

        // Core update
        if (in_array($type, ['all', 'core'])) {
            $update_core = get_site_transient('update_core');
            if (!empty($update_core->updates)) {
                foreach ($update_core->updates as $update) {
                    if ($update->response === 'upgrade') {
                        $skin = new Automatic_Upgrader_Skin();
                        $upgrader = new Core_Upgrader($skin);
                        $result = $upgrader->upgrade($update);
                        $results['core'] = is_wp_error($result)
                            ? ['success' => false, 'error' => $result->get_error_message()]
                            : ['success' => true, 'version' => $update->current];
                        break;
                    }
                }
            }
        }

        // Plugin updates — use bulk_upgrade for reliability
        if (in_array($type, ['all', 'plugins'])) {
            wp_update_plugins();
            $update_plugins = get_site_transient('update_plugins');
            if (!empty($update_plugins->response)) {
                $plugin_files = array_keys($update_plugins->response);
                if (!empty($items)) {
                    $plugin_files = array_intersect($plugin_files, $items);
                }

                if (!empty($plugin_files)) {
                    $skin = new Automatic_Upgrader_Skin();
                    $upgrader = new Plugin_Upgrader($skin);
                    $bulk_result = $upgrader->bulk_upgrade($plugin_files);

                    $all_plugins = get_plugins();
                    foreach ($plugin_files as $plugin_file) {
                        $name = isset($all_plugins[$plugin_file]) ? $all_plugins[$plugin_file]['Name'] : $plugin_file;
                        $plugin_result = isset($bulk_result[$plugin_file]) ? $bulk_result[$plugin_file] : null;
                        $success = !is_wp_error($plugin_result) && !empty($plugin_result);
                        $error = null;
                        if (is_wp_error($plugin_result)) {
                            $error = $plugin_result->get_error_message();
                        } elseif (empty($plugin_result)) {
                            $error = 'Update failed or not needed';
                        }
                        $results['plugins'][] = [
                            'file'    => $plugin_file,
                            'name'    => $name,
                            'success' => $success,
                            'error'   => $error,
                        ];
                    }
                }
            }
        }

        // Theme updates — use bulk_upgrade for reliability
        if (in_array($type, ['all', 'themes'])) {
            wp_update_themes();
            $update_themes = get_site_transient('update_themes');
            if (!empty($update_themes->response)) {
                $theme_slugs = array_keys($update_themes->response);
                if (!empty($items)) {
                    $theme_slugs = array_intersect($theme_slugs, $items);
                }

                if (!empty($theme_slugs)) {
                    $skin = new Automatic_Upgrader_Skin();
                    $upgrader = new Theme_Upgrader($skin);
                    $bulk_result = $upgrader->bulk_upgrade($theme_slugs);

                    foreach ($theme_slugs as $theme_slug) {
                        $theme_result = isset($bulk_result[$theme_slug]) ? $bulk_result[$theme_slug] : null;
                        $success = !is_wp_error($theme_result) && !empty($theme_result);
                        $error = null;
                        if (is_wp_error($theme_result)) {
                            $error = $theme_result->get_error_message();
                        } elseif (empty($theme_result)) {
                            $error = 'Update failed or not needed';
                        }
                        $results['themes'][] = [
                            'slug'    => $theme_slug,
                            'success' => $success,
                            'error'   => $error,
                        ];
                    }
                }
            }
        }

        // Force WordPress to re-check for remaining updates
        delete_site_transient('update_plugins');
        delete_site_transient('update_themes');
        delete_site_transient('update_core');
        wp_update_plugins();
        wp_update_themes();
        wp_version_check();

        // Count remaining updates
        $remaining_plugins = get_site_transient('update_plugins');
        $remaining_themes  = get_site_transient('update_themes');
        $remaining_core    = get_site_transient('update_core');

        $plugins_remaining = !empty($remaining_plugins->response) ? count($remaining_plugins->response) : 0;
        $themes_remaining  = !empty($remaining_themes->response) ? count($remaining_themes->response) : 0;
        $core_remaining    = false;
        if (!empty($remaining_core->updates)) {
            foreach ($remaining_core->updates as $update) {
                if ($update->response === 'upgrade') {
                    $core_remaining = true;
                    break;
                }
            }
        }

        $plugins_succeeded = count(array_filter($results['plugins'], function($p) { return $p['success']; }));
        $plugins_failed    = count(array_filter($results['plugins'], function($p) { return !$p['success']; }));
        $themes_succeeded  = count(array_filter($results['themes'], function($t) { return $t['success']; }));
        $themes_failed     = count(array_filter($results['themes'], function($t) { return !$t['success']; }));

        return rest_ensure_response([
            'success'    => true,
            'results'    => $results,
            'summary'    => [
                'plugins_updated' => $plugins_succeeded,
                'plugins_failed'  => $plugins_failed,
                'themes_updated'  => $themes_succeeded,
                'themes_failed'   => $themes_failed,
                'core_updated'    => $results['core'] ? $results['core']['success'] : null,
            ],
            'remaining'  => [
                'plugins_count' => $plugins_remaining,
                'themes_count'  => $themes_remaining,
                'core_update'   => $core_remaining,
            ],
            'updated_at' => gmdate('c'),
        ]);
    }

    /**
     * Admin settings page
     */
    public function add_settings_page() {
        add_options_page(
            'Handy Manager',
            'Handy Manager',
            'manage_options',
            'handy-manager',
            [$this, 'render_settings_page']
        );
    }

    public function register_settings() {
        register_setting('handy_manager_settings', $this->option_key, [
            'sanitize_callback' => 'sanitize_text_field',
        ]);
    }

    public function render_settings_page() {
        $secret = get_option($this->option_key, '');
        ?>
        <div class="wrap">
            <h1>Handy Manager Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('handy_manager_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="handy_secret">Secret Key</label></th>
                        <td>
                            <input type="text" id="handy_secret" name="<?php echo esc_attr($this->option_key); ?>"
                                   value="<?php echo esc_attr($secret); ?>" class="regular-text" />
                            <p class="description">
                                Enter the same secret key that is stored in your Handy-Subs system for this domain.
                            </p>
                        </td>
                    </tr>
                </table>
                <h3>API Endpoints</h3>
                <p><code>GET <?php echo esc_html(rest_url('handy-manager/v1/status')); ?></code> — Check for available updates</p>
                <p><code>POST <?php echo esc_html(rest_url('handy-manager/v1/update')); ?></code> — Run updates</p>
                <p>Include header: <code>X-Handy-Secret: your-secret-key</code></p>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
}

new Handy_Manager();
