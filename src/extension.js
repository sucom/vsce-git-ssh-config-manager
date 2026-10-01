const vscode   = require('vscode');
const fs       = require('fs');
const path     = require('path');
const os       = require('os');
const { exec } = require('child_process');

/**
 * Tree View Provider to parse and display ~/.ssh/config
 */
class SSHConfigProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.sshConfigPath = path.join(os.homedir(), '.ssh', 'config');
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  async getChildren(element) {
    const hosts = await this.parseConfig();

    if (!element) {
      // Top level: Group by HostName
      const groups = new Map();
      hosts.forEach(h => {
        const groupName = h.hostName || 'Others';
        if (!groups.has(groupName)) {
          groups.set(groupName, []);
        }
        groups.get(groupName).push(h);
      });

      return Array.from(groups.keys()).sort().map(groupName => {
        const item = new vscode.TreeItem(groupName, vscode.TreeItemCollapsibleState.Expanded);
        item.contextValue = 'sshGroup';
        item.iconPath = new vscode.ThemeIcon('globe');
        return item;
      });
    } else {
      // Child level: Hosts under a HostName
      return hosts
        .filter(h => (h.hostName || 'Others') === element.label)
        .map(h => {
          const item = new vscode.TreeItem(h.label, vscode.TreeItemCollapsibleState.None);
          item.contextValue = 'sshConfigItem';
          item.tooltip = h.identityFile || 'No IdentityFile specified';
          item.command = {
            command: 'git-ssh-config-manager.openConfig',
            title: 'Open Config',
            arguments: [h.line]
          };
          item.extraData = h;
          return item;
        });
    }
  }

  async parseConfig() {
    if (!fs.existsSync(this.sshConfigPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.sshConfigPath, 'utf8');
      const lines = content.split(/\r?\n/);
      const hosts = [];
      let currentHost = null;

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed) return;

        if (trimmed.toLowerCase().startsWith('host ')) {
          const hostName = trimmed.substring(5).trim();
          if (hostName !== '*') {
            currentHost = {
              label: hostName,
              line: index,
              identityFile: null,
              hostName: null
            };
            hosts.push(currentHost);
          }
        } else if (currentHost && trimmed.toLowerCase().startsWith('hostname ')) {
          currentHost.hostName = trimmed.substring(9).trim();
        } else if (currentHost && trimmed.toLowerCase().startsWith('identityfile ')) {
          let idPath = trimmed.substring(13).trim();
          idPath = idPath.replace(/^["']|["']$/g, '');
          if (idPath.startsWith('~')) {
            idPath = path.join(os.homedir(), idPath.substring(1));
          }
          currentHost.identityFile = idPath;
        }
      });
      return hosts;
    } catch (err) {
      vscode.window.showErrorMessage('Failed to read SSH config: ' + err.message);
      return [];
    }
  }
}

function activate(context) {
  const provider = new SSHConfigProvider();
  vscode.window.registerTreeDataProvider('git-ssh-config-manager-view', provider);

  // Command: Refresh
  context.subscriptions.push(
    vscode.commands.registerCommand('git-ssh-config-manager.refresh', () => {
      provider.refresh();
    })
  );

  // Command: Open Config
  context.subscriptions.push(
    vscode.commands.registerCommand('git-ssh-config-manager.openConfig', async (line) => {
      if (!fs.existsSync(provider.sshConfigPath)) {
        vscode.window.showInformationMessage('SSH config file does not exist yet.');
        return;
      }
      const doc = await vscode.workspace.openTextDocument(provider.sshConfigPath);
      const editor = await vscode.window.showTextDocument(doc);
      if (typeof line === 'number') {
        const pos = new vscode.Position(line, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos));
      }
    })
  );

  // Command: Open Public Key
  context.subscriptions.push(
    vscode.commands.registerCommand('git-ssh-config-manager.openPublicKey', async (item) => {
      const idFile = item.extraData.identityFile;
      if (!idFile) {
        vscode.window.showErrorMessage('No IdentityFile found for this host.');
        return;
      }

      const pubKeyPath = idFile + '.pub';
      if (!fs.existsSync(pubKeyPath)) {
        vscode.window.showErrorMessage('Public key file not found: ' + pubKeyPath);
        return;
      }

      try {
        const doc = await vscode.workspace.openTextDocument(pubKeyPath);
        await vscode.window.showTextDocument(doc);
      } catch (err) {
        vscode.window.showErrorMessage('Failed to open public key: ' + err.message);
      }
    })
  );

  // Command: Copy Public Key
  context.subscriptions.push(
    vscode.commands.registerCommand('git-ssh-config-manager.copyPublicKey', async (item) => {
      const idFile = item.extraData.identityFile;
      if (!idFile) {
        vscode.window.showErrorMessage('No IdentityFile found for this host.');
        return;
      }

      const pubKeyPath = idFile + '.pub';
      if (!fs.existsSync(pubKeyPath)) {
        vscode.window.showErrorMessage('Public key file not found: ' + pubKeyPath);
        return;
      }

      try {
        const pubKey = fs.readFileSync(pubKeyPath, 'utf8');
        await vscode.env.clipboard.writeText(pubKey.trim());
        vscode.window.showInformationMessage('Public key copied to clipboard!');
      } catch (err) {
        vscode.window.showErrorMessage('Failed to read public key: ' + err.message);
      }
    })
  );

  // Command: Create New SSH Key (The Wizard)
  context.subscriptions.push(
    vscode.commands.registerCommand('git-ssh-config-manager.createKey', async () => {
      let alias = await vscode.window.showInputBox({
        prompt: 'Enter Account Alias (e.g., work, personal)',
        placeHolder: 'e.g., work',
        ignoreFocusOut: true
      });
      if (!alias || !alias.trim()) return;
      alias = alias.trim();

      const email = await vscode.window.showInputBox({
        prompt: 'Enter Email for the SSH key comment',
        placeHolder: 'your-email@example.com',
        ignoreFocusOut: true
      });
      if (!email) return;

      const domain = await vscode.window.showInputBox({
        prompt: 'Enter Domain [e.g., github.com / bitbucket.org / gitlab.com / your-git-server] \n',
        value: 'github.com',
        placeHolder: 'e.g., github.com / bitbucket.org / gitlab.com / your-git-server',
        ignoreFocusOut: true
      });
      if (!domain) return;

      const sshDir = path.join(os.homedir(), '.ssh');
      if (!fs.existsSync(sshDir)) {
        fs.mkdirSync(sshDir, { recursive: true, mode: 0o700 });
      }

      const sshKeyType = await vscode.window.showQuickPick(['ed25519', 'rsa', 'ecdsa'], {
        placeHolder: 'Select SSH Key Type (Recommended: ed25519)',
        ignoreFocusOut: true
      });
      if (!sshKeyType) return;

      const safeAlias   = alias.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
      const keyFileName = `id-${sshKeyType}-${safeAlias}-${domain.replace(/\./g, '_')}`;
      const keyPath     = path.join(sshDir, keyFileName);

      if (fs.existsSync(keyPath)) {
        const overwrite = await vscode.window.showWarningMessage(
          `Key file ${keyFileName} already exists. Overwrite?`,
          'Yes', 'No'
        );
        if (overwrite !== 'Yes') return;
      }

      // Ensure we use quotes for paths with spaces
      const command = `ssh-keygen -t ${sshKeyType} -a 100 -C "${email}" -f "${keyPath}" -N ""`;

      exec(command, (error) => {
        if (error) {
          vscode.window.showErrorMessage('Failed to generate key: ' + error.message);
          return;
        }

        // Append to config
        const configBlock = `\nHost ${alias}\n  HostName ${domain}\n  User git\n  IdentityFile ~/.ssh/${keyFileName}\n`;
        try {
          fs.appendFileSync(provider.sshConfigPath, configBlock);
          vscode.window.showInformationMessage(`SSH key generated and added to config as "${alias}"!`);
          provider.refresh();
        } catch (err) {
          vscode.window.showErrorMessage('Failed to update SSH config: ' + err.message);
        }
      });
    })
  );

  // Auto-refresh when config file changes (works for both VS Code and external edits)
  const configWatcher = vscode.workspace.createFileSystemWatcher(provider.sshConfigPath);
  configWatcher.onDidChange(async () => await provider.refresh());
  configWatcher.onDidCreate(async () => await provider.refresh());
  configWatcher.onDidDelete(async () => await provider.refresh());
  context.subscriptions.push(configWatcher);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
