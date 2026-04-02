<?php
/**
 * Plugin Name: Handy Manager
 * Description: Remote WordPress management API for Handy-Subs. Updates, health, security, database, errors, plugins, and uptime monitoring.
 * Version: 2.0.0
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
        // Track login activity
        add_action('wp_login', [$this, 'track_login'], 10, 2);
        add_action('wp_login_failed', [$this, 'track_failed_login']);
    }

    // ─── CORS ────────────────────────────────────────────────────────────

    public function add_cors_headers() {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: X-Handy-Secret, Content-Type, Accept');
            header('Access-Control-Max-Age: 86400');
            status_header(200);
            exit;
        }

        remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
        add_filter('rest_pre_serve_request', function ($value) {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: X-Handy-Secret, Content-Type, Accept');
            return $value;
        });
    }

    // ─── ROUTES ──────────────────────────────────────────────────────────

    public function register_routes() {
        $ns = 'handy-manager/v1';
        $auth = [$this, 'verify_secret'];

        // Existing
        register_rest_route($ns, '/status',           ['methods' => 'GET',  'callback' => [$this, 'get_status'],           'permission_callback' => $auth]);
        register_rest_route($ns, '/update',            ['methods' => 'POST', 'callback' => [$this, 'run_updates'],          'permission_callback' => $auth]);

        // New v2.0
        register_rest_route($ns, '/ping',              ['methods' => 'GET',  'callback' => [$this, 'get_ping'],             'permission_callback' => $auth]);
        register_rest_route($ns, '/health',            ['methods' => 'GET',  'callback' => [$this, 'get_health'],           'permission_callback' => $auth]);
        register_rest_route($ns, '/security',          ['methods' => 'GET',  'callback' => [$this, 'get_security'],         'permission_callback' => $auth]);
        register_rest_route($ns, '/errors',            ['methods' => 'GET',  'callback' => [$this, 'get_errors'],           'permission_callback' => $auth]);
        register_rest_route($ns, '/errors/clear',      ['methods' => 'POST', 'callback' => [$this, 'clear_errors'],         'permission_callback' => $auth]);
        register_rest_route($ns, '/database',          ['methods' => 'GET',  'callback' => [$this, 'get_database'],         'permission_callback' => $auth]);
        register_rest_route($ns, '/database/optimize', ['methods' => 'POST', 'callback' => [$this, 'optimize_database'],    'permission_callback' => $auth]);
        register_rest_route($ns, '/plugins',           ['methods' => 'GET',  'callback' => [$this, 'get_plugins_list'],     'permission_callback' => $auth]);
        register_rest_route($ns, '/plugins/toggle',    ['methods' => 'POST', 'callback' => [$this, 'toggle_plugin'],        'permission_callback' => $auth]);
        register_rest_route($ns, '/users/activity',    ['methods' => 'GET',  'callback' => [$this, 'get_users_activity'],   'permission_callback' => $auth]);
    }

    // ─── AUTH ────────────────────────────────────────────────────────────

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

    // ─── 1. PING (lightweight uptime check) ─────────────────────────────

    public function get_ping($request) {
        global $wpdb;
        $start = microtime(true);

        $db_ok = (bool) $wpdb->query('SELECT 1');
        $disk_free = @disk_free_space(ABSPATH);

        return rest_ensure_response([
            'alive'            => true,
            'wp_version'       => get_bloginfo('version'),
            'php_version'      => phpversion(),
            'response_time_ms' => round((microtime(true) - $start) * 1000, 2),
            'memory_usage_mb'  => round(memory_get_usage() / 1048576, 2),
            'memory_peak_mb'   => round(memory_get_peak_usage() / 1048576, 2),
            'db_responsive'    => $db_ok,
            'disk_free_gb'     => $disk_free !== false ? round($disk_free / 1073741824, 2) : null,
            'timestamp'        => gmdate('c'),
        ]);
    }

    // ─── 2. STATUS (updates check - existing) ───────────────────────────

    public function get_status($request) {
        require_once ABSPATH . 'wp-admin/includes/update.php';
        require_once ABSPATH . 'wp-admin/includes/plugin.php';

        wp_update_plugins();
        wp_update_themes();
        wp_version_check();

        $update_plugins = get_site_transient('update_plugins');
        $update_themes  = get_site_transient('update_themes');
        $update_core    = get_site_transient('update_core');

        $core_update = false;
        $core_version = get_bloginfo('version');
        if (!empty($update_core->updates)) {
            foreach ($update_core->updates as $u) {
                if ($u->response === 'upgrade') { $core_update = $u->current; break; }
            }
        }

        $plugins = [];
        if (!empty($update_plugins->response)) {
            $all = get_plugins();
            foreach ($update_plugins->response as $file => $data) {
                $plugins[] = [
                    'file'        => $file,
                    'name'        => isset($all[$file]) ? $all[$file]['Name'] : $file,
                    'current'     => isset($all[$file]) ? $all[$file]['Version'] : 'unknown',
                    'new_version' => $data->new_version,
                ];
            }
        }

        $themes = [];
        if (!empty($update_themes->response)) {
            foreach ($update_themes->response as $slug => $data) {
                $t = wp_get_theme($slug);
                $themes[] = [
                    'slug'        => $slug,
                    'name'        => $t->get('Name'),
                    'current'     => $t->get('Version'),
                    'new_version' => $data['new_version'],
                ];
            }
        }

        return rest_ensure_response([
            'success'       => true,
            'site_url'      => get_site_url(),
            'wp_version'    => $core_version,
            'core_update'   => $core_update,
            'plugins_count' => count($plugins),
            'themes_count'  => count($themes),
            'plugins'       => $plugins,
            'themes'        => $themes,
            'php_version'   => phpversion(),
            'checked_at'    => gmdate('c'),
        ]);
    }

    // ─── 3. UPDATE (bulk updates - existing, improved) ──────────────────

    public function run_updates($request) {
        if (function_exists('set_time_limit')) { set_time_limit(300); }

        require_once ABSPATH . 'wp-admin/includes/update.php';
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/misc.php';
        require_once ABSPATH . 'wp-admin/includes/theme.php';

        if (!defined('FS_METHOD')) { define('FS_METHOD', 'direct'); }

        $type  = $request->get_param('type') ?: 'all';
        $items = $request->get_param('items') ?: [];
        $results = ['core' => null, 'plugins' => [], 'themes' => []];

        // Core
        if (in_array($type, ['all', 'core'])) {
            $uc = get_site_transient('update_core');
            if (!empty($uc->updates)) {
                foreach ($uc->updates as $u) {
                    if ($u->response === 'upgrade') {
                        $upgrader = new Core_Upgrader(new Automatic_Upgrader_Skin());
                        $r = $upgrader->upgrade($u);
                        $results['core'] = is_wp_error($r)
                            ? ['success' => false, 'error' => $r->get_error_message()]
                            : ['success' => true, 'version' => $u->current];
                        break;
                    }
                }
            }
        }

        // Plugins
        if (in_array($type, ['all', 'plugins'])) {
            wp_update_plugins();
            $up = get_site_transient('update_plugins');
            if (!empty($up->response)) {
                $files = array_keys($up->response);
                if (!empty($items)) { $files = array_intersect($files, $items); }
                if (!empty($files)) {
                    $bulk = (new Plugin_Upgrader(new Automatic_Upgrader_Skin()))->bulk_upgrade($files);
                    $all = get_plugins();
                    foreach ($files as $f) {
                        $r = isset($bulk[$f]) ? $bulk[$f] : null;
                        $results['plugins'][] = [
                            'file'    => $f,
                            'name'    => isset($all[$f]) ? $all[$f]['Name'] : $f,
                            'success' => !is_wp_error($r) && !empty($r),
                            'error'   => is_wp_error($r) ? $r->get_error_message() : (empty($r) ? 'Failed' : null),
                        ];
                    }
                }
            }
        }

        // Themes
        if (in_array($type, ['all', 'themes'])) {
            wp_update_themes();
            $ut = get_site_transient('update_themes');
            if (!empty($ut->response)) {
                $slugs = array_keys($ut->response);
                if (!empty($items)) { $slugs = array_intersect($slugs, $items); }
                if (!empty($slugs)) {
                    $bulk = (new Theme_Upgrader(new Automatic_Upgrader_Skin()))->bulk_upgrade($slugs);
                    foreach ($slugs as $s) {
                        $r = isset($bulk[$s]) ? $bulk[$s] : null;
                        $results['themes'][] = [
                            'slug'    => $s,
                            'success' => !is_wp_error($r) && !empty($r),
                            'error'   => is_wp_error($r) ? $r->get_error_message() : (empty($r) ? 'Failed' : null),
                        ];
                    }
                }
            }
        }

        // Re-check remaining
        delete_site_transient('update_plugins');
        delete_site_transient('update_themes');
        delete_site_transient('update_core');
        wp_update_plugins(); wp_update_themes(); wp_version_check();

        $rp = get_site_transient('update_plugins');
        $rt = get_site_transient('update_themes');
        $rc = get_site_transient('update_core');
        $pr = !empty($rp->response) ? count($rp->response) : 0;
        $tr = !empty($rt->response) ? count($rt->response) : 0;
        $cr = false;
        if (!empty($rc->updates)) { foreach ($rc->updates as $u) { if ($u->response === 'upgrade') { $cr = true; break; } } }

        return rest_ensure_response([
            'success'   => true,
            'results'   => $results,
            'summary'   => [
                'plugins_updated' => count(array_filter($results['plugins'], function($p) { return $p['success']; })),
                'plugins_failed'  => count(array_filter($results['plugins'], function($p) { return !$p['success']; })),
                'themes_updated'  => count(array_filter($results['themes'], function($t) { return $t['success']; })),
                'themes_failed'   => count(array_filter($results['themes'], function($t) { return !$t['success']; })),
                'core_updated'    => $results['core'] ? $results['core']['success'] : null,
            ],
            'remaining' => ['plugins_count' => $pr, 'themes_count' => $tr, 'core_update' => $cr],
            'updated_at' => gmdate('c'),
        ]);
    }

    // ─── 4. HEALTH (site health & environment) ──────────────────────────

    public function get_health($request) {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/plugin.php';

        $active_plugins = get_option('active_plugins', []);
        $all_plugins = get_plugins();
        $theme = wp_get_theme();

        $disk_total = @disk_total_space(ABSPATH);
        $disk_free  = @disk_free_space(ABSPATH);

        // SSL check
        $ssl_expiry = null;
        $site_url = get_site_url();
        if (strpos($site_url, 'https') === 0) {
            $host = parse_url($site_url, PHP_URL_HOST);
            $ctx = @stream_context_create(['ssl' => ['capture_peer_cert' => true, 'verify_peer' => false]]);
            $stream = @stream_socket_client("ssl://$host:443", $errno, $errstr, 5, STREAM_CLIENT_CONNECT, $ctx);
            if ($stream) {
                $params = stream_context_get_params($stream);
                if (isset($params['options']['ssl']['peer_certificate'])) {
                    $cert = openssl_x509_parse($params['options']['ssl']['peer_certificate']);
                    $ssl_expiry = isset($cert['validTo_time_t']) ? gmdate('c', $cert['validTo_time_t']) : null;
                }
                fclose($stream);
            }
        }

        return rest_ensure_response([
            'success'     => true,
            'wordpress'   => [
                'version'        => get_bloginfo('version'),
                'site_url'       => get_site_url(),
                'home_url'       => get_home_url(),
                'multisite'      => is_multisite(),
                'debug_mode'     => defined('WP_DEBUG') && WP_DEBUG,
                'debug_log'      => defined('WP_DEBUG_LOG') && WP_DEBUG_LOG,
                'debug_display'  => defined('WP_DEBUG_DISPLAY') && WP_DEBUG_DISPLAY,
                'memory_limit'   => defined('WP_MEMORY_LIMIT') ? WP_MEMORY_LIMIT : 'default',
                'cron_disabled'  => defined('DISABLE_WP_CRON') && DISABLE_WP_CRON,
                'file_edit'      => !defined('DISALLOW_FILE_EDIT') || !DISALLOW_FILE_EDIT,
                'force_ssl'      => defined('FORCE_SSL_ADMIN') && FORCE_SSL_ADMIN,
            ],
            'server'      => [
                'php_version'      => phpversion(),
                'php_memory_limit' => ini_get('memory_limit'),
                'max_execution'    => ini_get('max_execution_time'),
                'max_upload'       => ini_get('upload_max_filesize'),
                'post_max_size'    => ini_get('post_max_size'),
                'mysql_version'    => $wpdb->db_version(),
                'server_software'  => isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : 'unknown',
                'os'               => php_uname('s') . ' ' . php_uname('r'),
            ],
            'disk'        => [
                'total_gb' => $disk_total !== false ? round($disk_total / 1073741824, 2) : null,
                'free_gb'  => $disk_free  !== false ? round($disk_free / 1073741824, 2)  : null,
                'used_pct' => ($disk_total && $disk_free) ? round((1 - $disk_free / $disk_total) * 100, 1) : null,
            ],
            'ssl'         => [
                'enabled'  => is_ssl(),
                'expiry'   => $ssl_expiry,
            ],
            'theme'       => [
                'name'    => $theme->get('Name'),
                'version' => $theme->get('Version'),
                'parent'  => $theme->parent() ? $theme->parent()->get('Name') : null,
            ],
            'plugins'     => [
                'total'    => count($all_plugins),
                'active'   => count($active_plugins),
                'inactive' => count($all_plugins) - count($active_plugins),
            ],
            'checked_at'  => gmdate('c'),
        ]);
    }

    // ─── 5. SECURITY AUDIT ──────────────────────────────────────────────

    public function get_security($request) {
        $checks = [];

        // WordPress version
        $checks[] = $this->sec_check('WordPress Version', get_bloginfo('version'), 'info');

        // File editing
        $disabled = defined('DISALLOW_FILE_EDIT') && DISALLOW_FILE_EDIT;
        $checks[] = $this->sec_check('File Editing Disabled', $disabled ? 'Yes' : 'No', $disabled ? 'pass' : 'warning');

        // Force SSL
        $ssl = defined('FORCE_SSL_ADMIN') && FORCE_SSL_ADMIN;
        $checks[] = $this->sec_check('Force SSL Admin', $ssl ? 'Yes' : 'No', $ssl ? 'pass' : 'warning');

        // Debug display
        $debug_display = defined('WP_DEBUG_DISPLAY') && WP_DEBUG_DISPLAY;
        $checks[] = $this->sec_check('Debug Display Hidden', $debug_display ? 'Exposed!' : 'Hidden', $debug_display ? 'fail' : 'pass');

        // Debug mode
        $debug = defined('WP_DEBUG') && WP_DEBUG;
        $checks[] = $this->sec_check('Debug Mode', $debug ? 'Enabled' : 'Disabled', $debug ? 'warning' : 'pass');

        // Default admin user
        $admin_exists = (bool) get_user_by('login', 'admin');
        $checks[] = $this->sec_check('Default "admin" Username', $admin_exists ? 'Exists' : 'Not found', $admin_exists ? 'fail' : 'pass');

        // Number of admins
        $admins = get_users(['role' => 'administrator', 'fields' => 'ID']);
        $checks[] = $this->sec_check('Admin Accounts', count($admins) . ' found', count($admins) > 3 ? 'warning' : 'pass');

        // Database prefix
        global $wpdb;
        $default_prefix = ($wpdb->prefix === 'wp_');
        $checks[] = $this->sec_check('Database Prefix', $wpdb->prefix, $default_prefix ? 'warning' : 'pass');

        // wp-config.php permissions
        $config_path = ABSPATH . 'wp-config.php';
        if (!file_exists($config_path)) { $config_path = dirname(ABSPATH) . '/wp-config.php'; }
        if (file_exists($config_path)) {
            $perms = substr(sprintf('%o', fileperms($config_path)), -3);
            $world_readable = (int)$perms[2] >= 4;
            $checks[] = $this->sec_check('wp-config.php Permissions', $perms, $world_readable ? 'fail' : 'pass');
        }

        // Information disclosure files
        foreach (['readme.html', 'license.txt'] as $f) {
            $exists = file_exists(ABSPATH . $f);
            $checks[] = $this->sec_check("$f Removed", $exists ? 'Still exists' : 'Removed', $exists ? 'warning' : 'pass');
        }

        // Inactive plugins (attack surface)
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        $all = get_plugins();
        $active = get_option('active_plugins', []);
        $inactive = count($all) - count($active);
        $checks[] = $this->sec_check('Inactive Plugins', "$inactive found", $inactive > 0 ? 'warning' : 'pass');

        // XML-RPC
        $xmlrpc = !has_filter('xmlrpc_enabled') || apply_filters('xmlrpc_enabled', true);
        $checks[] = $this->sec_check('XML-RPC', $xmlrpc ? 'Enabled' : 'Disabled', $xmlrpc ? 'warning' : 'pass');

        // Score
        $pass = count(array_filter($checks, function($c) { return $c['status'] === 'pass'; }));
        $total = count($checks);
        $score = $total > 0 ? round(($pass / $total) * 100) : 0;

        return rest_ensure_response([
            'success'    => true,
            'score'      => $score,
            'checks'     => $checks,
            'checked_at' => gmdate('c'),
        ]);
    }

    private function sec_check($name, $detail, $status) {
        return ['check' => $name, 'detail' => $detail, 'status' => $status];
    }

    // ─── 6. ERROR LOG ───────────────────────────────────────────────────

    public function get_errors($request) {
        $lines = min((int) ($request->get_param('lines') ?: 50), 200);
        $log_path = WP_CONTENT_DIR . '/debug.log';

        $result = [
            'success'       => true,
            'debug_enabled' => defined('WP_DEBUG') && WP_DEBUG,
            'log_enabled'   => defined('WP_DEBUG_LOG') && WP_DEBUG_LOG,
            'log_exists'    => file_exists($log_path),
            'log_size_kb'   => file_exists($log_path) ? round(filesize($log_path) / 1024, 2) : 0,
            'entries'       => [],
            'checked_at'    => gmdate('c'),
        ];

        if (file_exists($log_path) && is_readable($log_path)) {
            $all_lines = file($log_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($all_lines !== false) {
                $result['entries'] = array_values(array_slice($all_lines, -$lines));
            }
        }

        return rest_ensure_response($result);
    }

    public function clear_errors($request) {
        $log_path = WP_CONTENT_DIR . '/debug.log';
        if (file_exists($log_path) && is_writable($log_path)) {
            file_put_contents($log_path, '');
            return rest_ensure_response(['success' => true, 'message' => 'Error log cleared']);
        }
        return rest_ensure_response(['success' => false, 'message' => 'Log file not found or not writable']);
    }

    // ─── 7. DATABASE ────────────────────────────────────────────────────

    public function get_database($request) {
        global $wpdb;

        // Table sizes
        $tables = [];
        $total_size = 0;
        $rows = $wpdb->get_results("SHOW TABLE STATUS FROM `" . DB_NAME . "`", ARRAY_A);
        foreach ($rows as $row) {
            $size = ($row['Data_length'] + $row['Index_length']);
            $total_size += $size;
            if (strpos($row['Name'], $wpdb->prefix) === 0) {
                $tables[] = [
                    'name'    => $row['Name'],
                    'rows'    => (int) $row['Rows'],
                    'size_mb' => round($size / 1048576, 2),
                ];
            }
        }

        // Cleanup counts
        $revisions  = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'revision'");
        $drafts     = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_status = 'auto-draft'");
        $trash      = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_status = 'trash'");
        $spam       = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->comments} WHERE comment_approved = 'spam'");
        $trash_comm = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->comments} WHERE comment_approved = 'trash'");
        $transients = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE '%_transient_%' AND option_name LIKE '%_transient_timeout_%' AND option_value < " . time());

        return rest_ensure_response([
            'success'      => true,
            'total_size_mb' => round($total_size / 1048576, 2),
            'tables'       => $tables,
            'cleanable'    => [
                'revisions'        => $revisions,
                'auto_drafts'      => $drafts,
                'trashed_posts'    => $trash,
                'spam_comments'    => $spam,
                'trashed_comments' => $trash_comm,
                'expired_transients' => $transients,
            ],
            'checked_at'   => gmdate('c'),
        ]);
    }

    public function optimize_database($request) {
        global $wpdb;
        $action = $request->get_param('action') ?: 'clean_all';
        $cleaned = [];

        if (in_array($action, ['clean_all', 'clean_revisions'])) {
            $c = $wpdb->query("DELETE FROM {$wpdb->posts} WHERE post_type = 'revision'");
            $cleaned['revisions'] = (int) $c;
        }
        if (in_array($action, ['clean_all', 'clean_drafts'])) {
            $c = $wpdb->query("DELETE FROM {$wpdb->posts} WHERE post_status = 'auto-draft'");
            $cleaned['auto_drafts'] = (int) $c;
        }
        if (in_array($action, ['clean_all', 'clean_trash'])) {
            $c1 = $wpdb->query("DELETE FROM {$wpdb->posts} WHERE post_status = 'trash'");
            $c2 = $wpdb->query("DELETE FROM {$wpdb->comments} WHERE comment_approved = 'trash'");
            $cleaned['trashed_posts'] = (int) $c1;
            $cleaned['trashed_comments'] = (int) $c2;
        }
        if (in_array($action, ['clean_all', 'clean_spam'])) {
            $c = $wpdb->query("DELETE FROM {$wpdb->comments} WHERE comment_approved = 'spam'");
            $cleaned['spam_comments'] = (int) $c;
        }
        if (in_array($action, ['clean_all', 'clean_transients'])) {
            $c = $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '%_transient_%'");
            $cleaned['transients'] = (int) $c;
        }
        if (in_array($action, ['clean_all', 'optimize_tables'])) {
            $tables = $wpdb->get_col("SHOW TABLES LIKE '{$wpdb->prefix}%'");
            foreach ($tables as $t) {
                $wpdb->query("OPTIMIZE TABLE `$t`");
            }
            $cleaned['tables_optimized'] = count($tables);
        }

        // Clean orphaned meta
        if (in_array($action, ['clean_all', 'clean_orphans'])) {
            $c1 = $wpdb->query("DELETE pm FROM {$wpdb->postmeta} pm LEFT JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE p.ID IS NULL");
            $c2 = $wpdb->query("DELETE cm FROM {$wpdb->commentmeta} cm LEFT JOIN {$wpdb->comments} c ON c.comment_ID = cm.comment_id WHERE c.comment_ID IS NULL");
            $cleaned['orphaned_postmeta'] = (int) $c1;
            $cleaned['orphaned_commentmeta'] = (int) $c2;
        }

        return rest_ensure_response(['success' => true, 'cleaned' => $cleaned, 'optimized_at' => gmdate('c')]);
    }

    // ─── 8. PLUGINS LIST & TOGGLE ───────────────────────────────────────

    public function get_plugins_list($request) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        $all = get_plugins();
        $active = get_option('active_plugins', []);
        $updates = get_site_transient('update_plugins');

        $plugins = [];
        foreach ($all as $file => $data) {
            $plugins[] = [
                'file'        => $file,
                'name'        => $data['Name'],
                'version'     => $data['Version'],
                'author'      => strip_tags($data['Author']),
                'active'      => in_array($file, $active),
                'update'      => isset($updates->response[$file]) ? $updates->response[$file]->new_version : null,
                'auto_update' => in_array($file, (array) get_option('auto_update_plugins', [])),
            ];
        }

        // Themes
        $themes = [];
        $active_theme = get_stylesheet();
        foreach (wp_get_themes() as $slug => $theme) {
            $themes[] = [
                'slug'    => $slug,
                'name'    => $theme->get('Name'),
                'version' => $theme->get('Version'),
                'active'  => ($slug === $active_theme),
                'parent'  => $theme->parent() ? $theme->parent()->get('Name') : null,
            ];
        }

        return rest_ensure_response(['success' => true, 'plugins' => $plugins, 'themes' => $themes]);
    }

    public function toggle_plugin($request) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        $plugin = $request->get_param('plugin');
        $action = $request->get_param('action');

        if (!$plugin || !in_array($action, ['activate', 'deactivate'])) {
            return rest_ensure_response(['success' => false, 'error' => 'Provide plugin file and action (activate/deactivate)']);
        }

        if ($action === 'activate') {
            $result = activate_plugin($plugin);
            if (is_wp_error($result)) {
                return rest_ensure_response(['success' => false, 'error' => $result->get_error_message()]);
            }
        } else {
            deactivate_plugins($plugin);
        }

        return rest_ensure_response([
            'success' => true,
            'plugin'  => $plugin,
            'active'  => is_plugin_active($plugin),
        ]);
    }

    // ─── 9. USERS ACTIVITY ──────────────────────────────────────────────

    public function track_login($user_login, $user) {
        update_user_meta($user->ID, '_handy_last_login', time());
        $count = (int) get_user_meta($user->ID, '_handy_login_count', true);
        update_user_meta($user->ID, '_handy_login_count', $count + 1);
    }

    public function track_failed_login($username) {
        $fails = (int) get_transient('handy_failed_logins') ?: 0;
        set_transient('handy_failed_logins', $fails + 1, HOUR_IN_SECONDS);
    }

    public function get_users_activity($request) {
        $users = get_users(['role__in' => ['administrator', 'editor', 'author']]);
        $result = [];

        foreach ($users as $user) {
            $last_login = get_user_meta($user->ID, '_handy_last_login', true);
            $login_count = (int) get_user_meta($user->ID, '_handy_login_count', true);
            $sessions = WP_Session_Tokens::get_instance($user->ID)->get_all();

            $result[] = [
                'id'              => $user->ID,
                'username'        => $user->user_login,
                'email'           => $user->user_email,
                'role'            => implode(', ', $user->roles),
                'last_login'      => $last_login ? gmdate('c', (int) $last_login) : null,
                'login_count'     => $login_count,
                'active_sessions' => count($sessions),
            ];
        }

        $failed_logins = (int) get_transient('handy_failed_logins') ?: 0;

        return rest_ensure_response([
            'success'              => true,
            'users'                => $result,
            'failed_logins_1h'     => $failed_logins,
            'checked_at'           => gmdate('c'),
        ]);
    }

    // ─── ADMIN SETTINGS PAGE ────────────────────────────────────────────

    public function add_settings_page() {
        add_options_page('Handy Manager', 'Handy Manager', 'manage_options', 'handy-manager', [$this, 'render_settings_page']);
    }

    public function register_settings() {
        register_setting('handy_manager_settings', $this->option_key, ['sanitize_callback' => 'sanitize_text_field']);
    }

    public function render_settings_page() {
        $secret = get_option($this->option_key, '');
        $base = rest_url('handy-manager/v1');
        ?>
        <div class="wrap">
            <h1>Handy Manager v2.0</h1>
            <form method="post" action="options.php">
                <?php settings_fields('handy_manager_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th><label for="handy_secret">Secret Key</label></th>
                        <td>
                            <input type="text" id="handy_secret" name="<?php echo esc_attr($this->option_key); ?>"
                                   value="<?php echo esc_attr($secret); ?>" class="regular-text" />
                            <p class="description">Must match the key in your Handy-Subs dashboard.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            <h2>API Endpoints</h2>
            <p>Header: <code>X-Handy-Secret: your-key</code></p>
            <table class="widefat striped" style="max-width:700px">
                <thead><tr><th>Method</th><th>Endpoint</th><th>Description</th></tr></thead>
                <tbody>
                    <tr><td>GET</td><td><code>/ping</code></td><td>Uptime check & performance</td></tr>
                    <tr><td>GET</td><td><code>/status</code></td><td>Check for updates</td></tr>
                    <tr><td>POST</td><td><code>/update</code></td><td>Run updates</td></tr>
                    <tr><td>GET</td><td><code>/health</code></td><td>Site health & environment</td></tr>
                    <tr><td>GET</td><td><code>/security</code></td><td>Security audit</td></tr>
                    <tr><td>GET</td><td><code>/errors</code></td><td>View error log</td></tr>
                    <tr><td>POST</td><td><code>/errors/clear</code></td><td>Clear error log</td></tr>
                    <tr><td>GET</td><td><code>/database</code></td><td>Database stats & cleanup counts</td></tr>
                    <tr><td>POST</td><td><code>/database/optimize</code></td><td>Clean & optimize database</td></tr>
                    <tr><td>GET</td><td><code>/plugins</code></td><td>List all plugins & themes</td></tr>
                    <tr><td>POST</td><td><code>/plugins/toggle</code></td><td>Activate/deactivate plugin</td></tr>
                    <tr><td>GET</td><td><code>/users/activity</code></td><td>User login activity</td></tr>
                </tbody>
            </table>
            <p style="margin-top:15px;color:#666">Base URL: <code><?php echo esc_html($base); ?></code></p>
        </div>
        <?php
    }
}

new Handy_Manager();
