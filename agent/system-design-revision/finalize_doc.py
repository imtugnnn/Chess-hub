from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from lxml import etree as E
import copy,hashlib,json

root=Path.cwd();work=root/'agent/system-design-revision';final=root/'docs/word/ChessHub_Software_Design_Specification.docx'
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships','a':'http://schemas.openxmlformats.org/drawingml/2006/main','wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}
w=lambda x:'{'+ns['w']+'}'+x
with ZipFile(final) as z:parts={n:z.read(n) for n in z.namelist()}
with ZipFile(work/'working.docx') as z:
 updated=E.fromstring(z.read('word/document.xml'))
 updated_styles=E.fromstring(z.read('word/styles.xml'))
old=E.fromstring(parts['word/document.xml'])
images={}
for d in old.xpath('//w:drawing',namespaces=ns):
 key=d.find('.//wp:docPr',ns).get('name');images[key]=d.find('.//a:blip',ns).get('{'+ns['r']+'}embed')
for d in updated.xpath('//w:drawing',namespaces=ns):
 key=d.find('.//wp:docPr',ns).get('name');assert key in images
 d.find('.//a:blip',ns).set('{'+ns['r']+'}embed',images[key])
for current,original in zip(updated.xpath('//w:sectPr',namespaces=ns),old.xpath('//w:sectPr',namespaces=ns)):current.getparent().replace(current,copy.deepcopy(original))
for font in updated.xpath('//w:rFonts',namespaces=ns):
 for attr in list(font.attrib):del font.attrib[attr]
 for key in ['ascii','hAnsi','cs','eastAsia']:font.set(w(key),'Calibri')
rels=E.fromstring(parts['word/_rels/document.xml.rels']);ids={e.get('Id') for e in rels}
for el in updated.iter():
 for key,value in el.attrib.items():
  if key.startswith('{'+ns['r']+'}'):assert value in ids,(key,value)
texts=''.join(updated.xpath('//w:t/text()',namespaces=ns))
assert not any(s in texts for s in ['[Team Name]','[Month,','[Goal 1','Lorem ipsum','TRẠNG THÁI1'])
anchors=set(updated.xpath('//w:hyperlink/@w:anchor',namespaces=ns));bookmarks=set(updated.xpath('//w:bookmarkStart/@w:name',namespaces=ns));assert anchors<=bookmarks
styles=updated_styles
for f in styles.xpath('//w:rFonts',namespaces=ns):
 for attr in list(f.attrib):del f.attrib[attr]
 for k in ['ascii','hAnsi','eastAsia','cs']:f.set(w(k),'Calibri')
used=set(updated.xpath('//w:pStyle/@w:val',namespaces=ns));known=set(styles.xpath('//w:style/@w:styleId',namespaces=ns));assert used<=known
parts['word/styles.xml']=E.tostring(styles,encoding='UTF-8',xml_declaration=True,standalone=True)
parts['word/document.xml']=E.tostring(updated,encoding='UTF-8',xml_declaration=True,standalone=True)
settings=E.fromstring(parts['word/settings.xml']);up=settings.find('w:updateFields',ns)
if up is not None:up.set(w('val'),'false')
parts['word/settings.xml']=E.tostring(settings,encoding='UTF-8',xml_declaration=True,standalone=True)
with ZipFile(final,'w',ZIP_DEFLATED) as z:
 for n,b in parts.items():z.writestr(n,b)
print('Final package with cached TOC;',len(anchors),'working anchors; original relationships and section geometry retained')
