import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

window.onerror = (msg, src, line, col, err) => {
  document.getElementById('app').innerHTML = `<pre style="color:red;padding:20px;font-size:12px">JS ERROR:\n${msg}\n${src}:${line}:${col}\n${err?.stack||''}</pre>`;
};
window.onunhandledrejection = (e) => {
  document.getElementById('app').innerHTML = `<pre style="color:red;padding:20px;font-size:12px">PROMISE ERROR:\n${e.reason?.stack||e.reason}</pre>`;
};

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
