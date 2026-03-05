# O Jeito Mais Fácil do Mundo: Publicando na Hostinger (Sem Terminal)

Esqueça a tela preta preta (SSH). Se você usa o plano normal da Hostinger (Premium, Business ou Cloud), a própria Hostinger criou um painel com botões que faz tudo por você. 

Aqui está o atalho **Definitivo e Mais Fácil**, usando **arquivos ZIP**.

---

## 📦 PASSO 1: Preparando os arquivos no seu Computador (ZIP)

Para não ter que arrastar milhares de arquivos um por um e a internet travar, vamos compactar tudo em 2 arquivos `.zip`.

1. **O ZIP do Frontend (O Site Visual):**
   - Vá na pasta `C:\Users\adria\Desktop\ALC - SEARA\dist` (A pasta `dist` principal, de fora).
   - Selecione tudo o que tem lá dentro (arquivos e pastas).
   - Clique com o botão direito > **Comprimir para arquivo ZIP**.
   - Chame esse arquivo de `site.zip`.

2. **O ZIP do Backend (O Servidor e Robô):**
   - Vá na pasta `C:\Users\adria\Desktop\ALC - SEARA\server`.
   - Selecione apenas 4 coisas:
     1. A pasta `dist` (de dentro do server)
     2. A pasta `uploads`
     3. O arquivo `package.json`
     4. O arquivo `.env` (Lembre-se de colocar a senha do Banco da Hostinger nele!)
   - **NÃO adicione** `node_modules` nem `src`.
   - Clique com o botão direito > **Comprimir para arquivo ZIP**.
   - Chame esse arquivo de `servidor.zip`.

---

## 🌐 PASSO 2: Colocando o Site no Ar (hPanel)

1. Acesse o painel da Hostinger no seu navegador de internet.
2. Clique em **Sites** e depois no botão **Gerenciador de Arquivos** do seu domínio `alcepereirafilho.com`.
3. Abra a pasta `public_html`. (Se tiver lixo dentro, apague).
4. Arraste o arquivo **`site.zip`** do seu PC e solte lá dentro para fazer o upload.
5. Clique com o botão direito em cima do `site.zip` e escolha **Extrair** (Extract).
6. Configure as rotas:
   - Clique no botão de Novo Arquivo, nomeie como `.htaccess`.
   - Cole isso dentro dele e salve:
     ```apache
     <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /
       RewriteRule ^index\.html$ - [L]
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule . /index.html [L]
     </IfModule>
     ```
   
🎉 *Pronto! Se você acessar seu site agora, a tela de login já vai abrir perfeitamente.*

---

## ⚙️ PASSO 3: Ligando o Backend (O Motor do Sistema)

1. Volte na tela principal do painel da Hostinger (hPanel). No menu lateral, procure por **Avançado** e clique em **App Node.js**.
2. **Crie o app:**
   - **Node version:** 20 (ou 18)
   - **Application Mode:** Production
   - **Application URL:** Selecione `api.alcepereirafilho.com` (se você for usar subdomínio) ou deixe `/api`.
   - **Application root:** `/backend`
   - **Application startup file:** `dist/index.js`
   - Clique em **Criar / Salvar**.
3. A Hostinger vai criar uma pasta chamada `/backend`. Volte no **Gerenciador de Arquivos**, abra a pasta `/backend`.
4. Arraste o arquivo **`servidor.zip`** lá para dentro e extraia ele (botão direito > Extrair).
5. Volte na tela **App Node.js** da Hostinger, encontre seu aplicativo na lista e clique no botão **STOP** para garantir que está parado.
6. Clique no botão azul **NPM INSTALL**. (Isso faz a Hostinger baixar os módulos sozinha. Aguarde concluir).
7. Clique no botão verde **START**.

💥 **O Sistema todo está online!**

---

### ⚠️ IMPORTANTE: O Robô do Ravex na Hostinger Normal

Os servidores compartilhados da Hostinger **não deixam o Chrome/Puppeteer instalar suas partes gráficas**. Se quando você tentar "Sincronizar Ravex" no site der um erro *"Failed to launch browser"*:

1. O Puppeteer infelizmente precisa de Servidor VPS (Linux puro) no qual você tenha a senha `root` para instalar pacotes gráficos via terminal (`apt-get install libnss3 libx11...`).
2. Se você usa Hospedagem normal (u323034450@), ele não vai deixar rodar o robô que acessa o site do Ravex. 
3. A única alternativa nesses planos é usar um Puppeteer na Nuvem grátis (como o plano free do **Browserless.io**) e mudar 1 linha no código da sua API para se conectar nele em vez de tentar abrir no servidor da Hostinger.
