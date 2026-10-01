//RINGFLOW 入口檔案（準備重構）
function bootstrap() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-6 text-slate-400">
      <div class="text-center space-y-2">
        <h1 class="text-xl font-bold text-slate-700">RINGFLOW</h1>
        <p class="text-sm">前端 UI 已清理完成，等待重構...</p>
      </div>
    </div>
  `;
}

window.addEventListener("DOMContentLoaded", bootstrap);
