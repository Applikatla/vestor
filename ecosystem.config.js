module.exports = {
  apps: [
    {
      name: "vestor-backend",
      cwd: "./backend",
      script: "./bin/server",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        PORT: 8080,
      },
    },
    {
      name: "vestor-frontend",
      cwd: "./frontend",
      script: "npm",
      args: "start",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
      },
    },
  ],
};

