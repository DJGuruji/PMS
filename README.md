## docker-compose.dev.yml

```bash
version: "3.9"

services:
  postgres:
    image: postgres:16
    container_name: postgres_db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: app_password
      POSTGRES_DB: app_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network

volumes:
  postgres_data:
 

networks:
  app_network:
    driver: bridge

    ```

## .env

```bash

NODE_ENV=development
DATABASE_URL="postgresql://app_user:app_password@localhost:5432/app_db?schema=public" (sample value)
JWT_ACCESS_SECRET=""
JWT_REFRESH_SECRET=""


```


