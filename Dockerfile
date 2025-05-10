From node: 20-alpine

WORKDIR /src

COPY . /src

RUN npm --production

EXPOSE 8080

CMD ["node", "index.js"]