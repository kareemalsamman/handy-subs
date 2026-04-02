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
        require_once ABSPATH . 'wp-admin/includes/update.php';
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/misc.php';

        $type  = $request->get_param('type') ?: 'all';
        $items = $request->get_param('items') ?: [];
        $results = ['core' => null, 'plugins' => [], 'themes' => []];

        // Silent upgrader skin - no output
        $skin = new Automatic_Upgrader_Skin();

        // Core update
        if (in_array($type, ['all', 'core'])) {
            $update_core = get_site_transient('update_core');
            if (!empty($update_core->updates)) {
                foreach ($update_core->updates as $update) {
                    if ($update->response === 'upgrade') {
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

        // Plugin updates
        if (in_array($type, ['all', 'plugins'])) {
            $update_plugins = get_site_transient('update_plugins');
            if (!empty($update_plugins->response)) {
                $upgrader = new Plugin_Upgrader($skin);
                foreach ($update_plugins->response as $plugin_file => $plugin_data) {
                    if (!empty($items) && !in_array($plugin_file, $items)) {
                        continue;
                    }
                    $result = $upgrader->upgrade($plugin_file);
                    $all_plugins = get_plugins();
                    $name = isset($all_plugins[$plugin_file]) ? $all_plugins[$plugin_file]['Name'] : $plugin_file;
                    $results['plugins'][] = [
                        'file'    => $plugin_file,
                        'name'    => $name,
                        'success' => !is_wp_error($result) && $result !== false,
                        'error'   => is_wp_error($result) ? $result->get_error_message() : null,
                    ];
                }
            }
        }

        // Theme updates
        if (in_array($type, ['all', 'themes'])) {
            $update_themes = get_site_transient('update_themes');
            if (!empty($update_themes->response)) {
                $upgrader = new Theme_Upgrader($skin);
                foreach ($update_themes->response as $theme_slug => $theme_data) {
                    if (!empty($items) && !in_array($theme_slug, $items)) {
                        continue;
                    }
                    $result = $upgrader->upgrade($theme_slug);
                    $results['themes'][] = [
                        'slug'    => $theme_slug,
                        'success' => !is_wp_error($result) && $result !== false,
                        'error'   => is_wp_error($result) ? $result->get_error_message() : null,
                    ];
                }
            }
        }

        return rest_ensure_response([
            'success'    => true,
            'results'    => $results,
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
