$ErrorActionPreference='Stop'
$repoBase='C:\Users\Lamtu\OneDrive\Documents\Github\ChessHub'
$workDoc=Join-Path $repoBase 'agent\system-design-revision\working.docx'
Copy-Item -LiteralPath (Join-Path $repoBase 'docs\word\ChessHub_Software_Design_Specification.docx') -Destination $workDoc -Force
$word=New-Object -ComObject Word.Application
$word.Visible=$false
$word.DisplayAlerts=0
try {
 $document=$word.Documents.Open($workDoc,$false,$false)
 $document.Fields.Update() | Out-Null
 foreach($toc in $document.TablesOfContents){$toc.Update()}
 $document.Repaginate()
 foreach($toc in $document.TablesOfContents){$toc.UpdatePageNumbers()}
 $document.Save()
 $document.ExportAsFixedFormat((Join-Path $repoBase 'agent\system-design-revision\final.pdf'),17)
 Write-Output ('Pages: '+$document.ComputeStatistics(2)+'; TOCs: '+$document.TablesOfContents.Count)
 $document.Close(0)
} finally {$word.Quit()}
