# Tutorial Definitivo: Backend no Render + Frontend na Hostinger

Este é o guia mais moderno, grátis e à prova de falhas para o seu caso. O **Render.com** é um servidor de altíssima performance para Node.js, e a sua **Hostinger** cuidará apenas de mostrar a tela bonita (Frontend) no seu domínio.

---

## ☁️ PASSO 1: Hospedar o Servidor Node no Render (Grátis)

O Render precisa pegar o código do seu servidor diretamente do GitHub.

### 1. Coloque seu Servidor no GitHub
1. Crie uma conta no [GitHub](https://github.com/).
2. No seu computador, abra o site do GitHub, vá em **Repositories** e clique em **New** (Novo).
3. Dê o nome de `seara-backend`, deixe como **Private** (Privado) e clique em `Create repository`.
4. O GitHub vai te dar uma tela com comandos. No seu PC, abra o terminal no VSCode dentro da pasta **`server`** (`C:\Users\adria\Desktop\ALC - SEARA\server`) e rode exatamente isso (substitua SeuUsuario pelo seu nome de usuário no github do link que aparecer na tela):
   ```bash
   git init
   git add .
   git commit -m "Meu servidor inicial"
   git branch -M mai
   git remote add origin https://github.com/SeuUsuario/seara-backend.git
   git push -u origin main
   ```

### 2. Ligue o Render
1. Crie uma conta no site [Render.com](https://render.com/) (Pode logar usando o próprio GitHub).
2. No painel do Render, clique no botão superior **"New +"** e escolha **Web Service**.
3. Na lista, escolha a opção **"Build and deploy from a Git repository"** e clique em Next.
4. Conecte sua conta do GitHub. O Render vai listar seu novo repositório `seara-backend`. Selecione ele!
5. Preencha as configurações do seu servidor:
   - **Name:** Pode ser `api-seara`
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`  *(Muito importante: isso faz o Render instalar e compilar sozinho!)*
   - **Start Command:** `npm start`
6. Desça a página até a seção **Environment Variables** (Variáveis de Ambiente). Clique em **Add Environment Variable** e crie as mesmas chaves do seu arquivo `.env`:
   - Chave: `DB_HOST` | Valor: *(o IP/host do banco MySQL da Hostinger)*
   - Chave: `DB_USER` | Valor: *(seu usuario do banco)*
   - Chave: `DB_PASSWORD` | Valor: *(sua senha do banco)*
   - Chave: `DB_NAME` | Valor: *(o nome do banco)*
   - Chave: `BROWSERLESS_API_KEY` | Valor: `2U2nGoVdomzxXEfc3cda872d8a92c2e7f92bbf608262b9dbe`
7. Clique no botão azul gigante lá embaixo: **Create Web Service**.

🎉 **Pronto!** O Render vai criar seu servidor e a barra de log vai aparecer rodando. No canto superior esquerdo (debaixo do nome `api-seara`), você verá uma URL do tipo `https://api-seara.onrender.com`.  **Copie esse link! Ele é a nova alma do seu sistema.**

---

## 🖼️ PASSO 2: Linkar o Frontend e colocar na Hostinger

Agora que temos o servidor rodando e sabemos o link dele (`https://api-seara.onrender.com`), precisamos dizer para a tela gráfica mandar as informações pra esse endereço.

### 1. Ajuste a Variável do Projeto
1. No seu VSCode, abra o arquivo principal onde fica sua URL base (geralmente em `src/constants.ts`, ou procure por `API_URL` nos seus arquivos). 
   - Se for no `constants.ts`, altere para: `export const API_URL = "https://api-seara.onrender.com/api";` 
   - Se você estiver lendo do `.env` do Vite, coloque lá: `VITE_API_URL=https://api-seara.onrender.com/api`
   *(Certifique-se de que o link termine em /api).*
2. Com a URL salva, compile o seu site visual de novo. No terminal aberto na pasta raiz (`C:\Users\adria\Desktop\ALC - SEARA`), rode:
   ```bash
   npm run build
   ```

### 2. Jogue os arquivos Zipados na Hostinger
Agora voltamos ao método fácil da Hostinger, apenas para a telinha!

1. Vá na pasta `C:\Users\adria\Desktop\ALC - SEARA\dist`.
2. Selecione todos os arquivos lá dentro e crie um arquivo ZIP (`site.zip`).
3. Abra o **hPanel** da Hostinger, vá em **Gerenciador de Arquivos** no seu domínio principal (`alcepereirafilho.com`).
4. Navegue até `public_html`. (Se tiver lixo dentro, apague).
5. Arraste o arquivo `site.zip` do seu PC e solte lá dentro. Em seguida, clique nele com botão direito e escola **Extrair**.
6. Crie o arquivo das rotas: Novo Arquivo > chame de `.htaccess` e coloque:
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

🔥 **MÁGICA CONCLUÍDA!**
Se você entrar no seu domínio `alcepereirafilho.com`, o site vai abrir super rápido pela rede global da Hostinger. Quando você logar ou tentar atualizar algo, ele vai mandar o comando invisível para o `api-seara.onrender.com`, que vai fazer o trabalho pesado, acessar seu banco de dados, ativar o robô via *Browserless*, e devolver o resultado! Tudo isso em nuvens separadas de alta performance e totalmente de graça.
