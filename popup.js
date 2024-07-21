document.addEventListener('DOMContentLoaded', function() {
    const addAccountBtn = document.getElementById('addAccount');
    const exportAccountsBtn = document.getElementById('exportAccounts');
    const importAccountsBtn = document.getElementById('importAccountsBtn');
    const importAccountsInput = document.getElementById('importAccounts');
    const developer = document.getElementById('developer');
    const developerLinks = document.getElementById('developer-links');
    const githubLink = document.getElementById('githubLink');
    const donateLink = document.getElementById('donateLink');
    const clearDataBtn = document.getElementById('clearData');
    const currentDomainSpan = document.getElementById('currentDomain');

    let currentDomain = '';

    function handleCurrentDomain(domain) {
        currentDomain = domain;
        currentDomainSpan.textContent = domain;
        renderAccounts(domain);
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const url = new URL(tabs[0].url);
        handleCurrentDomain(url.hostname);
    });

    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.active) {
            const url = new URL(tab.url);
            handleCurrentDomain(url.hostname);
        }
    });

    if (addAccountBtn) {
        addAccountBtn.addEventListener('click', () => addAccount(currentDomain));
    }
    if (exportAccountsBtn) {
        exportAccountsBtn.addEventListener('click', exportAccounts);
    }
    if (importAccountsBtn) {
        importAccountsBtn.addEventListener('click', () => importAccountsInput.click());
    }
    if (importAccountsInput) {
        importAccountsInput.addEventListener('change', importAccounts);
    }
    if (developer) {
        developer.addEventListener('click', () => {
            if (developerLinks.style.display === 'none' || developerLinks.style.display === '') {
                developerLinks.style.display = 'block';
            } else {
                developerLinks.style.display = 'none';
            }
        });
    }
    if (githubLink) {
        githubLink.addEventListener('click', () => {
            window.open('https://github.com/SkyLandYT2', '_blank');
        });
    }
    if (donateLink) {
        donateLink.addEventListener('click', () => {
            window.open('https://www.donationalerts.com/c/skylandyt', '_blank');
        });
    }
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', clearAllData);
    }
});

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        chrome.storage.local.clear(function() {
            console.log('All data cleared.');
            alert('All data has been cleared.');
            renderAccounts('');
        });
    }
}

function addAccount(domain) {
    const accountName = prompt('Enter account name:');
    if (accountName) {
        chrome.cookies.getAll({ domain: domain }, function(cookies) {
            const accountData = {
                name: accountName,
                cookies: cookies
            };

            chrome.storage.local.get({ accounts: {} }, function(result) {
                const accounts = result.accounts;
                if (!accounts[domain]) {
                    accounts[domain] = [];
                }
                accounts[domain].push(accountData);
                chrome.storage.local.set({ accounts }, function() {
                    console.log(`Account "${accountName}" added for domain ${domain}.`);
                    renderAccounts(domain);
                });
            });
        });
    }
}

function renderAccounts(domain) {
    chrome.storage.local.get({ accounts: {} }, function(result) {
        const accountsList = document.getElementById('accountsList');
        accountsList.innerHTML = '';
        if (result.accounts[domain]) {
            result.accounts[domain].forEach((account, index) => {
                const accountDiv = document.createElement('div');
                accountDiv.className = 'account';
                accountDiv.textContent = account.name;

                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'account-buttons';

                const switchBtn = document.createElement('button');
                switchBtn.textContent = 'Switch';
                switchBtn.addEventListener('click', () => switchToAccount(domain, index));

                const renameBtn = document.createElement('button');
                renameBtn.textContent = 'Rename';
                renameBtn.addEventListener('click', () => renameAccount(domain, index));

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', () => deleteAccount(domain, index));

                buttonsDiv.appendChild(switchBtn);
                buttonsDiv.appendChild(renameBtn);
                buttonsDiv.appendChild(deleteBtn);

                accountDiv.appendChild(buttonsDiv);

                accountDiv.addEventListener('click', () => {
                    const allAccounts = document.querySelectorAll('.account');
                    allAccounts.forEach(acc => acc.classList.remove('active'));
                    accountDiv.classList.add('active');
                });

                accountsList.appendChild(accountDiv);
            });
        }
    });
}

function switchToAccount(domain, index) {
    chrome.storage.local.get({ accounts: {} }, function(result) {
        const account = result.accounts[domain][index];
        chrome.cookies.getAll({ domain: domain }, function(existingCookies) {
            existingCookies.forEach(cookie => {
                chrome.cookies.remove({ url: 'https://' + domain + cookie.path, name: cookie.name });
            });

            account.cookies.forEach(cookie => {
                const newCookie = {
                    url: 'https://' + domain + cookie.path,
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly
                };

                if (!isNaN(cookie.expirationDate) && isFinite(cookie.expirationDate)) {
                    newCookie.expirationDate = Math.floor(cookie.expirationDate);
                }

                Object.keys(newCookie).forEach(key => {
                    if (newCookie[key] === undefined) {
                        delete newCookie[key];
                    }
                });

                chrome.cookies.set(newCookie, function(setCookie) {
                    if (chrome.runtime.lastError) {
                        console.error(`Error setting cookie "${newCookie.name}": ${JSON.stringify(chrome.runtime.lastError)}`);
                    } else {
                        console.log(`Cookie set: ${JSON.stringify(setCookie)}`);
                    }
                });
            });

            alert('Switched to account: ' + account.name);
        });
    });
}

function renameAccount(domain, index) {
    const newName = prompt('Enter new account name:');
    if (newName) {
        chrome.storage.local.get({ accounts: {} }, function(result) {
            const accounts = result.accounts;
            if (accounts[domain]) {
                accounts[domain][index].name = newName;
                chrome.storage.local.set({ accounts }, function() {
                    console.log(`Account renamed to "${newName}" for domain ${domain}.`);
                    renderAccounts(domain);
                });
            }
        });
    }
}

function deleteAccount(domain, index) {
    if (confirm('Are you sure you want to delete this account?')) {
        chrome.storage.local.get({ accounts: {} }, function(result) {
            const accounts = result.accounts;
            if (accounts[domain]) {
                accounts[domain].splice(index, 1);
                if (accounts[domain].length === 0) {
                    delete accounts[domain];
                }
                chrome.storage.local.set({ accounts }, function() {
                    console.log(`Account deleted for domain ${domain}.`);
                    renderAccounts(domain);
                });
            }
        });
    }
}

function exportAccounts() {
    chrome.storage.local.get({ accounts: {} }, function(result) {
        const data = JSON.stringify(result.accounts);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'accounts.json';
        a.click();
        URL.revokeObjectURL(url);
    });
}

function importAccounts() {
    const file = document.getElementById('importAccounts').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                if (validateImportedData(data)) {
                    chrome.storage.local.set({ accounts: data }, function() {
                        console.log('Accounts imported.');
                        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                            const url = new URL(tabs[0].url);
                            renderAccounts(url.hostname);
                        });
                    });
                } else {
                    alert('Invalid file format.');
                }
            } catch (e) {
                alert('Invalid file format.');
            }
        };
        reader.readAsText(file);
    }
}

function validateImportedData(data) {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    for (const domain in data) {
        if (!Array.isArray(data[domain])) {
            return false;
        }
        for (const account of data[domain]) {
            if (typeof account.name !== 'string' || !Array.isArray(account.cookies)) {
                return false;
            }
            for (const cookie of account.cookies) {
                if (typeof cookie.name !== 'string' || typeof cookie.value !== 'string') {
                    return false;
                }
                if (cookie.expirationDate !== undefined &&
                    (isNaN(cookie.expirationDate) || !isFinite(cookie.expirationDate))) {
                    return false;
                }
            }
        }
    }
    return true;
}
