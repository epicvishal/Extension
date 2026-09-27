import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Site Data Editor',
    description: 'View and edit cookies, local/session storage and request headers for the current site',
    permissions: ['storage', 'activeTab', 'tabs', 'cookies', 'scripting', 'declarativeNetRequest'],
    host_permissions: ['<all_urls>'],
  },
});
