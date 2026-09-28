// The Clipboard API refuses when the document isn't focused (e.g. the side panel while focus is in
// the page), so fall back to the older copy command.
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    if (!copied) {
      console.error(error);
      throw new Error("The browser blocked copying. Click inside the extension and try again.");
    }
  }
}
