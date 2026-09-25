Add-Type -AssemblyName System.IO.Compression.FileSystem
$doc = "c:\Users\Hammouda\Downloads\Kwentra's Reservation & Guest Profile APIs.docx"
$out = "c:\Users\Hammouda\Desktop\Prime Hospitality\Server\docs\kwentra-api-extract.txt"
$zip = [System.IO.Compression.ZipFile]::OpenRead($doc)
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
$sr = New-Object System.IO.StreamReader($entry.Open())
$xml = $sr.ReadToEnd()
$sr.Close()
$zip.Dispose()
$xml = $xml -replace '</w:p>', "`n"
$xml = $xml -replace '<w:tab[^/]*/>', "`t"
$xml = $xml -replace '<[^>]+>', ''
$xml = [System.Net.WebUtility]::HtmlDecode($xml)
$xml = $xml -replace '[ \t]+', ' '
$xml = $xml -replace "(\r?\n){3,}", "`n`n"
Set-Content -Path $out -Value $xml.Trim() -Encoding UTF8
Write-Output ("chars=" + $xml.Length)
