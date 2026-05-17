import os

css_content = """
/* ==========================================================================
   ADVANCED RESPONSIVE DESIGN & MEDIA QUERIES
   ========================================================================== */

/* Mobile Small */
@media screen and (max-width: 375px) {
    .dashboard-hero { margin-bottom: 8px; padding: 5px; }
    .dashboard-hero h2 { font-size: 20px; }
    .stat-value { font-size: 20px; }
    .stat-label { font-size: 10px; }
    .fab-menu-container { bottom: 70px; right: 10px; }
    .main-fab { width: 50px; height: 50px; font-size: 20px; }
    .speedometer-wrapper { width: 140px; height: 140px; }
    .speed-value { font-size: 32px; }
    .modal-content { padding: 20px 15px; border-top-left-radius: 24px; border-top-right-radius: 24px; }
    .form-group input, .form-group select { padding: 12px; font-size: 14px; }
    .info-card { padding: 16px; margin-bottom: 12px; }
    .header-icon-glow { font-size: 30px; }
    .page-header h2 { font-size: 24px; }
    .health-bar-container { padding: 12px; }
    .qa-btn { padding: 12px 6px; }
    .qa-icon { width: 36px; height: 36px; font-size: 18px; }
}

/* Tablet Mini */
@media screen and (min-width: 481px) and (max-width: 768px) {
    body { padding: 30px; }
    .dashboard-hero { padding: 20px; }
    .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 15px; }
    .speedometer-wrapper { width: 200px; height: 200px; }
    .speed-value { font-size: 48px; }
    .dock-container { max-width: 500px; left: 50%; transform: translateX(-50%); border-radius: 30px; }
    .modal-content { max-width: 500px; margin: auto; border-radius: 32px; padding: 40px; }
    .info-card { padding: 30px; }
}

/* Tablet Desktop */
@media screen and (min-width: 769px) and (max-width: 1024px) {
    body { padding: 40px; max-width: 900px; margin: 0 auto; }
    .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .speedometer-wrapper { width: 220px; height: 220px; }
    .speed-value { font-size: 56px; }
    .dock-container { max-width: 600px; }
    .modal-content { max-width: 600px; }
}

/* Large Desktop */
@media screen and (min-width: 1025px) {
    body { padding: 40px 60px; max-width: 1200px; margin: 0 auto; }
    .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 24px; }
    .speedometer-wrapper { width: 260px; height: 260px; }
    .speed-value { font-size: 64px; }
    #app-root { display: grid; grid-template-columns: 2fr 1fr; gap: 40px; align-items: start; }
    .dock-container {
        position: fixed; left: 20px; top: 50%; transform: translateY(-50%);
        width: 80px; height: auto; flex-direction: column; padding: 20px 10px;
        border-radius: 40px; background: rgba(10,10,12,0.8);
    }
    .dock-item { margin-bottom: 20px; width: 60px; height: 60px; }
    .dock-item:last-child { margin-bottom: 0; }
    .dock-indicator { display: none; }
    .modal-content { max-width: 700px; margin: auto; align-self: center; border-radius: 36px; }
    .fab-menu-container { bottom: 40px; right: 40px; }
}

/* High Perf GPU Accelerated Animations */
.high-perf-anim {
    will-change: transform, opacity, filter;
    transform: translateZ(0); 
    backface-visibility: hidden;
    perspective: 1000px;
}

@keyframes liquidFlow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

/* Fluid Typography */
html { font-size: 16px; }
@media screen and (min-width: 320px) { html { font-size: calc(16px + 6 * ((100vw - 320px) / 680)); } }
@media screen and (min-width: 1000px) { html { font-size: 22px; } }

/* ==========================================================================
   UTILITY CLASSES (TAILWIND-LIKE) FOR SCALABILITY
   ========================================================================== */
"""

for i in range(0, 101, 5):
    css_content += f".m-{i} {{ margin: {i}px !important; }}\n"
    css_content += f".mt-{i} {{ margin-top: {i}px !important; }}\n"
    css_content += f".mb-{i} {{ margin-bottom: {i}px !important; }}\n"
    css_content += f".ml-{i} {{ margin-left: {i}px !important; }}\n"
    css_content += f".mr-{i} {{ margin-right: {i}px !important; }}\n"

for i in range(0, 101, 5):
    css_content += f".p-{i} {{ padding: {i}px !important; }}\n"
    css_content += f".pt-{i} {{ padding-top: {i}px !important; }}\n"
    css_content += f".pb-{i} {{ padding-bottom: {i}px !important; }}\n"
    css_content += f".pl-{i} {{ padding-left: {i}px !important; }}\n"
    css_content += f".pr-{i} {{ padding-right: {i}px !important; }}\n"

for i in range(1, 21):
    css_content += f".z-{i}0 {{ z-index: {i}0 !important; }}\n"

for i in range(1, 10):
    css_content += f".opacity-{i}0 {{ opacity: 0.{i} !important; }}\n"

for i in range(1, 11):
    css_content += f".flex-{i} {{ flex: {i} !important; }}\n"

for i in range(1, 37):
    css_content += f".rotate-{i*10} {{ transform: rotate({i*10}deg) !important; }}\n"

for i in range(1, 21):
    css_content += f".delay-{i*100} {{ transition-delay: {i*100}ms !important; animation-delay: {i*100}ms !important; }}\n"
    css_content += f".duration-{i*100} {{ transition-duration: {i*100}ms !important; animation-duration: {i*100}ms !important; }}\n"

with open("c:/Antigravity/ronin-smart-app/style.css", "a") as f:
    f.write(css_content)
