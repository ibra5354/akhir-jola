import sys, glob, subprocess, os
extra = sys.argv[1:]
src = sorted(glob.glob('src/*.js'))
js = '\n'.join(open(f).read() for f in src)
for e in extra: js += '\n' + open(e).read()
js = js.replace("from 'three/addons/", "from 'three/examples/jsm/")
os.makedirs('build', exist_ok=True)
open('build/entry.js', 'w').write(js)
r = subprocess.run(['/home/claude/deps/node_modules/.bin/esbuild', 'build/entry.js', '--bundle', '--format=iife', '--minify', '--target=es2019', '--legal-comments=none', '--outfile=build/bundle.js'], cwd='.', env=dict(os.environ, NODE_PATH='/home/claude/deps/node_modules'), capture_output=True, text=True)
if r.returncode: print(r.stderr); sys.exit(1)
bundle = open('build/bundle.js').read().replace('</script', '<\\/script')
tpl = open('template.html').read()
out = tpl.replace('/*__GAME__*/', lambda_ := bundle) if False else tpl.replace('/*__CSS__*/', open('ui.css').read()).replace('<!--__HTML__-->', open('ui.html').read())
out = out.replace('/*__GAME__*/', bundle)
name = 'build/test.html' if extra else 'build/hajwala.html'
open(name, 'w').write(out)
print(name, len(out)//1024, 'KB')
