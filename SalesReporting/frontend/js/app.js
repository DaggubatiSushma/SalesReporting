// ============================================================
//  app.js – Main init, tabs, and store switching
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const AUTH_TAB_KEY = 'sr_tab_authenticated';
  const AUTH_SESSION_KEY = 'sr_session_auth_key';
  const appShell = document.getElementById('appShell');
  const loginScreen = document.getElementById('loginScreen');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  let appInitialized = false;

  function hasTabAuth() {
    return sessionStorage.getItem(AUTH_TAB_KEY) === '1';
  }

  function hasClientAuth(authKey) {
    if (!hasTabAuth()) return false;
    const storedAuthKey = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!authKey || !storedAuthKey) {
      return true;
    }
    return storedAuthKey === authKey;
  }

  function markClientAuth(authKey) {
    sessionStorage.setItem(AUTH_TAB_KEY, '1');
    if (authKey) {
      sessionStorage.setItem(AUTH_SESSION_KEY, authKey);
    } else {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    }
  }

  function clearClientAuth() {
    sessionStorage.removeItem(AUTH_TAB_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  }

  function showStartupError(message) {
    if (appShell) appShell.classList.remove('hidden');
    if (loginScreen) loginScreen.classList.add('hidden');
    const banner = document.getElementById('startupError');
    const text = document.getElementById('startupErrorText');
    if (!banner || !text) return;
    text.textContent = message;
    banner.classList.remove('hidden');
  }

  function showLoginScreen(message = '') {
    if (appShell) appShell.classList.add('hidden');
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (loginError) {
      loginError.textContent = message;
      loginError.classList.toggle('hidden', !message);
    }
    const passwordInput = document.getElementById('loginPassword');
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.focus();
    }
  }

  function showApplication() {
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appShell) appShell.classList.remove('hidden');
    if (loginError) {
      loginError.textContent = '';
      loginError.classList.add('hidden');
    }
  }

  function initTabs() {
    const tabs = document.querySelectorAll('.main-tab-btn');
    const panels = document.querySelectorAll('.main-tab-panel');
    tabs.forEach(button => {
      button.addEventListener('click', () => {
        tabs.forEach(tab => tab.classList.remove('active'));
        panels.forEach(panel => panel.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.panel).classList.add('active');
      });
    });
  }

  function initEntryTabs() {
    const tabs = document.querySelectorAll('.entry-sub-tab');
    const panels = document.querySelectorAll('.entry-panel');
    tabs.forEach(button => {
      button.addEventListener('click', () => {
        tabs.forEach(tab => tab.classList.remove('active'));
        panels.forEach(panel => panel.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.panel).classList.add('active');
      });
    });
  }

  async function refreshAllModules() {
    await SalesEntry.refresh();
    await MonthlyEntry.refreshAll();
    await LCBOModule.refresh();
    await CreditCardReconciliation.refresh();
    await Reports.refreshAll();
  }

  async function loadStores(preferredStoreId = null) {
    const stores = await DataStore.getStores();
    if (!stores.length) return [];

    const selectedId = preferredStoreId && stores.some(store => store.id === preferredStoreId)
      ? preferredStoreId
      : (stores.some(store => store.id === DataStore.getActiveStore()) ? DataStore.getActiveStore() : stores[0].id);

    DataStore.setActiveStore(selectedId);

    const select = document.getElementById('storeSelect');
    select.innerHTML = '';
    stores.forEach(store => {
      const option = document.createElement('option');
      option.value = store.id;
      option.textContent = store.name;
      option.selected = store.id === selectedId;
      select.appendChild(option);
    });

    return stores;
  }

  async function initializeApplication() {
    if (!appInitialized) {
      initTabs();
      initEntryTabs();
      initModal();

      await loadStores();
      await SalesEntry.init();
      await MonthlyEntry.init();
      await LCBOModule.init();
      await CreditCardReconciliation.init();
      await Reports.init();

      document.getElementById('storeSelect').addEventListener('change', async event => {
        DataStore.setActiveStore(event.target.value);
        await loadStores(parseInt(event.target.value, 10));
        await refreshAllModules();
        showToast(`Switched to ${event.target.selectedOptions[0]?.textContent || 'store'}`);
      });

      appInitialized = true;
    } else {
      await loadStores();
      await refreshAllModules();
    }

    showApplication();
  }

  try {
    if (window.location.protocol === 'file:') {
      throw new Error('This app now requires the Python backend. Start it with start-server.ps1 or start-server.bat instead of opening index.html directly.');
    }

    if (!loginForm) {
      throw new Error('Login form is missing from the page.');
    }

    loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (loginError) {
        loginError.classList.add('hidden');
        loginError.textContent = '';
      }

      const username = document.getElementById('loginUsername')?.value || '';
      const password = document.getElementById('loginPassword')?.value || '';
      if (!username.trim() || !password) {
        if (loginError) {
          loginError.textContent = 'Enter username and password.';
          loginError.classList.remove('hidden');
        }
        return;
      }

      if (loginBtn) loginBtn.disabled = true;
      try {
        const authResult = await DataStore.login(username.trim(), password);
        markClientAuth(authResult?.authKey);
        await initializeApplication();
      } catch (error) {
        clearClientAuth();
        if (loginError) {
          loginError.textContent = error.message || 'Unable to login.';
          loginError.classList.remove('hidden');
        }
      } finally {
        if (loginBtn) loginBtn.disabled = false;
      }
    });

    logoutBtn?.addEventListener('click', async () => {
      try {
        await DataStore.logout();
      } catch (error) {
        console.error(error);
      }
      clearClientAuth();
      showLoginScreen();
    });

    window.addEventListener('sales-reporting:auth-required', () => {
      clearClientAuth();
      showLoginScreen('Session expired. Sign in again.');
    });

    const authStatus = await DataStore.getAuthStatus();
    if (authStatus?.authenticated && hasClientAuth(authStatus?.authKey)) {
      await initializeApplication();
    } else {
      clearClientAuth();
      showLoginScreen();
    }
  } catch (error) {
    console.error(error);
    if ((error.message || '').includes('Authentication required')) {
      showLoginScreen();
      return;
    }
    showStartupError(error.message || 'Application startup failed.');
  }
});
