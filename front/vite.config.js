import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// En dev, le front tourne sur le port de Vite (5173) et le backend sur 3000 :
// ce proxy évite les soucis de CORS / websocket cross-origin pendant le dev.
// En prod, server.js sert directement front/dist, donc ce proxy ne sert plus.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      // Le backend tourne en HTTPS (certificat local) : on accepte le
      // certificat auto-signé en dev.
      "/socket.io": { target: "https://localhost:3000", ws: true, secure: false },
    },
  },
});
