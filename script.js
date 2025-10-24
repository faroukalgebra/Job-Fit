// script.js
const API_BASE = ''; // If backend on same domain leave empty, or set to e.g. "https://yourdomain.com"

document.addEventListener('DOMContentLoaded', () => {
  const optimizeBtn = document.getElementById('optimizeBtn');
  const previewCard = document.getElementById('previewCard');
  const previewContent = document.getElementById('previewContent');
  const downloadBtn = document.getElementById('downloadBtn');

  // Demo: simple "optimize" — in real app you'd send file + job-url to backend to process
  optimizeBtn.addEventListener('click', async () => {
    const fileInput = document.getElementById('file-upload');
    const jobUrl = document.getElementById('job-url').value;
    const email = document.getElementById('email').value;

    if (!fileInput.files.length || !jobUrl || !email) {
      return alert('Please upload a CV, enter the job URL and your email to preview.');
    }

    // Show preview loading
    previewContent.innerHTML = '<p class="text-gray-500">Generating preview…</p>';
    previewCard.classList.remove('hidden');

    // In your real app: upload file + jobUrl to backend -> returns optimized_preview HTML or text
    // For demo we show a fake optimized preview
    setTimeout(() => {
      previewContent.innerHTML = `
        <p><strong>Professional summary:</strong> Results-driven Product Manager with 5+ years leading cross-functional teams to deliver revenue growth and operational improvements.</p>
        <p class="mt-2"><strong>Highlighted experience:</strong> Led a team of 6 to increase conversion by 24% (A/B tests, UX improvements).</p>
        <p class="mt-2 text-sm text-gray-500">Keywords added: product management, A/B testing, conversion optimization, stakeholder management.</p>
      `;
    }, 900);
  });

  // When user clicks Download: create Stripe Checkout session and redirect
  downloadBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    if (!email) return alert('Please enter your email before downloading.');

    try {
      // Call backend to create a Checkout Session for a subscription
      const resp = await fetch(`${API_BASE}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          // include any metadata needed to provision the download after success
          metadata: { _note: 'cv_download_request' }
        })
      });
      const data = await resp.json();
      if (data.url) {
        // redirect to Stripe Checkout
        window.location = data.url;
      } else {
        throw new Error(data.message || 'Failed to create checkout session');
      }
    } catch (err) {
      console.error(err);
      alert('Unable to start payment flow. Check console for details.');
    }
  });
});
