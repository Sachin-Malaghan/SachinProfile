"""October update: three Unreal games, Shunya Studio AI, AstroVerse Odyssey."""
import os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
f = os.path.join(ROOT, "portfolio", "index.html")
s = open(f, encoding="utf-8-sig").read()
new_games = open(os.path.join(os.environ["TEMP"], "claude", "games_section.html"), encoding="utf-8").read()

a = s.index('  <section id="games" aria-labelledby="game-h">')
b = s.index('  <section aria-labelledby="stack-h">')
s = s[:a] + new_games + s[b:]

def rep(old, new, count=1):
    global s
    assert old in s, old[:70]
    s = s.replace(old, new, count)

rep('<p class="eyebrow">C++ &middot; Unreal Engine 5 &middot; Game development &middot; VR</p>',
    '<p class="eyebrow">C++ &middot; Unreal Engine 5 &middot; Mobile games &middot; Simulation</p>')
rep('I build <em>simulations</em> that are physically right', 'I build <em>games and simulations</em> that are right under the hood')
rep("C++ developer building real-time 3D software: a real-scale solar system in Unreal Engine, a structural analysis editor, and a game engine written from scratch. I care about the maths being correct and the frame rate staying steady.",
    "C++ and Unreal Engine developer. I have built three mobile games, a real-scale solar system simulator, an exploded-view feature for an automotive company, and an AI-run game studio. I care about the maths being correct and the frame rate staying steady.")
# numbers strip
a = s.index('<div class="strip">'); b = s.index('</div>\n  </header>', a)
s = s[:a] + '''<div class="strip">
      <div><b class="mono">3 games</b><span>built in Unreal Engine 5 and C++ for Android, iOS and Windows</span></div>
      <div><b class="mono">31 levels</b><span>across EMBERHOME and ECHOES, every one proven finishable by an autopilot</span></div>
      <div><b class="mono">0.05&deg;</b><span>worst sun-position error in AstroVerse against NOAA's algorithm</span></div>
      <div><b class="mono">0 assets</b><span>in the games: all art and all sound are generated in code</span></div>
    ''' + s[b:]

# AstroVerse: Odyssey
rep('<li><b>Missions</b><span>Data-driven launch vehicles, gravity-turn ascent, staging, hand-flown docking with a ring ship</span></li>',
    '<li><b>Missions</b><span>Data-driven launch vehicles, gravity-turn ascent, staging, then hand-flown docking with Odyssey, a 340 m spinning ring station-ship modelled in Blender</span></li>')
s = re.sub(r'<button data-cap="India from low orbit[^\n]*</button>',
           '<button data-cap="Docked with Odyssey in low Earth orbit, choosing a destination"><img src="img/av_odyssey_docked.jpg" alt="Capsule docked with the Odyssey ring ship" loading="lazy"><figcaption>Docked with Odyssey</figcaption></button>', s)
s = re.sub(r'<button data-cap="Moon surface close-up"[^\n]*</button>',
           '<button data-cap="Approaching the Odyssey ring station-ship for docking"><img src="img/av_odyssey_approach.jpg" alt="Approaching the Odyssey ring ship" loading="lazy"><figcaption>Rendezvous</figcaption></button>', s)
assert "av_odyssey_docked" in s and "av_odyssey_approach" in s

# services: remove the duplicated card, add AI
dup = '''      <article>
        <h3>Game development</h3>
        <p>2D and 3D games for mobile, web and PC: gameplay, physics, level mechanics, touch controls, trailers and store assets.</p>
      </article>
'''
assert s.count(dup) == 2
s = s.replace(dup + dup, '''      <article>
        <h3>Mobile game development</h3>
        <p>Complete games in Unreal Engine 5 and C++ for Android and iOS: gameplay, physics, level design, touch controls, audio, and Play Store release builds.</p>
      </article>
      <article>
        <h3>AI agents &amp; automation</h3>
        <p>Agent pipelines with typed tools, permissions, budgets and human approval, including automated Unreal builds, tests and content.</p>
      </article>
''')
rep('.services { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }', '.services { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; }')
rep('<div><h3>Languages</h3><p>C++17/20, HLSL, GLSL, Python, JavaScript</p></div>', '<div><h3>Languages</h3><p>C++17/20, Python, HLSL, GLSL, JavaScript</p></div>')
rep('<div><h3>Engines</h3><p>Unreal Engine 5, custom C++ and JavaScript engines, ImGui, Qt/QML</p></div>', '<div><h3>Engines and platforms</h3><p>Unreal Engine 5, Android, iOS, Windows, custom C++ engines, ImGui</p></div>')
rep('<a class="link" href="#engines">Engines</a>', '<a class="link" href="#ai">AI</a>\n    <a class="link" href="#engines">Engines</a>')

# styles
rep('  /* engines */', '''  /* game case studies */
  .game { padding-top: 34px; margin-top: 34px; border-top: 1px solid var(--line); display: grid; gap: 22px; }
  .sec-head + .game { border-top: 0; padding-top: 0; margin-top: 0; }
  .game-head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .game-icon { width: 64px; height: 64px; border-radius: 14px; border: 1px solid var(--line); object-fit: cover; }
  .game-title { font-size: clamp(30px, 4vw, 44px); letter-spacing: 0.04em; }
  .game-title.serif { font-family: Georgia, "Times New Roman", serif; font-weight: 400; letter-spacing: 0.16em; }
  .game-tag { color: #c9d1e3; max-width: 56ch; margin-top: 4px; }
  .status { margin-left: auto; font: 500 12.5px/1 var(--mono); padding: 8px 12px; border-radius: 999px; border: 1px solid var(--green); color: var(--green); white-space: nowrap; }
  .status.dev { border-color: var(--sun); color: var(--sun); }
  .gallery-4 { margin-top: 0; grid-template-columns: repeat(4, 1fr); }
  .proto { border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; background: var(--panel-2); }
  .proto summary { cursor: pointer; font-weight: 600; }
  .proto p { color: var(--muted); font-size: 14px; margin: 10px 0 14px; max-width: 70ch; }
  .facts li b { color: var(--fact, var(--sun)); }

  /* engines */''')
rep('    .gallery { grid-template-columns: repeat(2, 1fr); }', '    .gallery, .gallery-4 { grid-template-columns: repeat(2, 1fr); }\n    .status { margin-left: 0; }')
rep('    .services, .process { grid-template-columns: 1fr 1fr; }', '    .services, .process { grid-template-columns: 1fr 1fr; }', 1)

# the prototype canvas is inside <details>: size it when opened
rep("    size(); addEventListener('resize', size);", "    size(); addEventListener('resize', size);\n    box.closest('details')?.addEventListener('toggle', size);")
open(f, "w", encoding="utf-8", newline="\n").write(s)
print("patched", len(s))
