import sys, glob
extra = sys.argv[1:]
src = sorted(glob.glob('src/*.js'))
js = '\n'.join(open(f).read() for f in src)
for e in extra: js += '\n' + open(e).read()
tpl = open('template.html').read()
out = tpl.replace('/*__GAME__*/', js).replace('/*__CSS__*/', open('ui.css').read()).replace('<!--__HTML__-->', open('ui.html').read())
name = 'build/test.html' if extra else 'build/hajwala.html'
open(name, 'w').write(out)
print(name, len(out)//1024, 'KB')
