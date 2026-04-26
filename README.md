# Git SSH Config Manager

<p align="center">
  <img src="icon.png" alt="Git SSH Config Manager" width="128"/>
</p>

A lightweight, offline VS Code extension to automate SSH key generation and manage your `~/.ssh/config` file directly from the editor.

## ✨ Features

- **Sidebar Integration**: View and manage your SSH configurations from a dedicated Activity Bar view.
- **Guided Key Generation**: Wizard-based flow to generate **Ed25519**, **RSA**, or **ECDSA** keys.
- **Automatic Config Management**: Automatically appends new `Host` blocks to your SSH config with correct syntax.
- **Quick Actions**:
  - **Jump to Config**: Open `~/.ssh/config` at the exact line of a host entry.
  - **Copy Public Key**: One-click copy of the public key to your clipboard.
  - **Open Public Key**: Quickly view the `.pub` file in the editor.
  - **Live Sync**: Automatically refreshes the list when your SSH config file changes.
- **Syntax Highlighting**: Includes native highlighting for `.ssh/config` files for easier manual editing.

## 🚀 Usage

1. Click the **Key** icon in the Activity Bar.
2. Click the **+** (plus) icon in the title bar to start the creation wizard.
3. Follow the guided prompts:
   - **Account Alias**: (e.g., `work`, `personal-github`)
   - **Email**: Used as a comment in the SSH key.
   - **Domain**: (e.g., `github.com`, `gitlab.com`, `your-internal-git-server.com`)
   - **Key Type**: Select between Ed25519 (Recommended), RSA, or ECDSA.
4. Your new key pair is generated in `~/.ssh/` and your config is automatically updated!

---

## 🔐 Educational Guide: Understanding Multi-Identity SSH

> **⚠️ IMPORTANT NOTE:** *The configurations below are fully automated by this extension. This guide is provided so you can understand the underlying mechanics and validate your setup—especially when juggling multiple accounts across different Git providers.*

### The Anatomy of a Multi-Account Config
When you use the wizard to create multiple identities (e.g., a personal GitHub account and a corporate Bitbucket account), the extension structures your `~/.ssh/config` file to route traffic automatically based on the `Host` alias.

Here is what a properly configured multi-identity file looks like under the hood:

~~~text
# 1. Personal GitHub Account
Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519-github-personal

# 2. Corporate Bitbucket Account
Host bitbucket-service1
  HostName bitbucket.org
  User git
  IdentityFile ~/.ssh/id_ed25519-bitbucket-service1

Host bitbucket-service2
  HostName bitbucket.org
  User git
  IdentityFile ~/.ssh/id_ed25519-bitbucket-service2

# 3. Client GitLab Account
Host gitlab-client1
  HostName gitlab.com
  User git
  IdentityFile ~/.ssh/id_ed25519-gitlab-client1

Host gitlab-client2
  HostName gitlab.com
  User git
  IdentityFile ~/.ssh/id_ed25519-gitlab-client2
~~~

### How It Works (The Routing Magic)
When you clone or set a remote URL using one of these aliases (e.g., `git clone git@github-personal:username/repo.git`), Git reads your config file. It matches the `github-personal` alias, resolves the real destination as `github.com`, and securely authenticates using *only* the specific `IdentityFile` tied to that alias.

### Validating Your Setup
To ensure your keys are properly configured and accepted by the providers, you can test the connection using the `Host` aliases you just created:

#### The Manual Step
The only step the extension *cannot* automate is handing your public key to the provider. For every new key you generate:
1. Click the host in the extension's sidebar and select **Copy Public Key**.
2. Paste it into your provider's SSH settings (e.g., GitHub -> Settings -> SSH and GPG keys).

Then validate using the command.

~~~shell
# Test your personal GitHub connection
ssh -T git@github-personal

# Test your corporate Bitbucket connection
ssh -T git@bitbucket-service1

# Test your client's GitLab connection
ssh -T git@gitlab-client1
~~~

> You may get a first-time warning. Continue connecting by typing `yes`.<br>
>
> `The authenticity of host 'github.com (n.n.n.n)' can't be established.`<br>
> `ED25519 key fingerprint is SHA256:+...x...y...z...U.`<br>
> `This key is not known by any other names.`<br>
> `Are you sure you want to continue connecting (yes/no/[fingerprint])? yes`<br>
> `Warning: Permanently added 'github.com' (ED25519) to the list of known hosts.`<br>
>
> This will create two files (`known_hosts`, `known_hosts.old`) in your `~/.ssh` folder.

*If successful, the provider will respond with a greeting confirming your specific username (e.g., "Hi username! You've successfully authenticated...").*

---

## 🛡️ Privacy & Security

- **100% Offline**: No external API calls, no tracking, no data collection.
- **No Dependencies**: Built using native Node.js modules and VS Code APIs.
- **Local Keys**: Your private keys never leave your machine.

## ☑️ Requirements

- VS Code v1.80.0 or higher.
- `ssh-keygen` must be installed and accessible in your system's PATH.
  - **Windows**: Included with [Git for Windows](https://git-scm.com/download/win) or OpenSSH Client.
  - **macOS/Linux**: Usually pre-installed.

## 📦 Installation

**Search in Extensions View:**
1. Open VS Code, VSCodium, Cursor, or Antigravity.
2. Go to Extensions (Press `Ctrl+Shift+X`).
3. Search for this extension **"Git SSH Config Manager"**.
4. Click **Install**.

## ⚖️ License

- MIT

## 🏠 Home

- [GitHub](https://github.com/sucom/vsce-git-ssh-config-manager)

## 🔗 Links

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=spajs.git-ssh-config-manager)
- [Open VSX Registry](https://open-vsx.org/extension/SPAjs/git-ssh-config-manager)


## 🔗 Other Related Extensions

- [Git Profile-Protocol Switcher](https://marketplace.visualstudio.com/items?itemName=spajs.git-profile-protocol-switcher) - For switching between HTTP(S) and SSH protocols.
- [Git Snapshots](https://marketplace.visualstudio.com/items?itemName=spajs.git-snapshots) - For Git based snapshots.
- [Git Pull Agent](https://marketplace.visualstudio.com/items?itemName=spajs.git-pull-agent) - For pulling changes from remote repo.