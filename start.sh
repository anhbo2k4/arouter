docker stop arouter
docker rm arouter
docker build -t arouter .
docker run -d --name arouter -p 1508:1508 --env-file .env -v arouter-data:/app/data arouter