module.exports = {
  apps: [
    {
      name: "redis",
      script: "redis-server",
      args: "/etc/redis/redis.conf --daemonize no",
      autorestart: false,
    },
    {
      name: "api",
      script: "node",
      args: "server.js",
    },
  ],
};
