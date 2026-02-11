# Estágio de Build
FROM node:20-alpine as build

WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./
RUN npm install

# Copia código fonte
COPY . .

# Argumentos de Build (necessários para o Vite "assar" as vars no código)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Define variáveis de ambiente durante o build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Executa o build
RUN npm run build

# Estágio de Produção
FROM nginx:alpine

# Remove config padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia nossa configuração personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos do build para o diretório do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
