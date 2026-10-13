# Privacy Policy – Labo Scrapbox Helper

**Last updated:** 2026-10-13

Labo Scrapbox Helper is a Chrome extension designed to support academic and research activities conducted on Scrapbox.

---

## 1. Data Collection

This extension does **not** collect, store, or transmit personal data to the developer.

---

## 2. Local Storage

The extension uses Chrome’s local storage (`chrome.storage.local`) to store user-configured settings, including but not limited to:

- Display preferences (panel size, opacity, font size, etc.)
- User-defined markers (e.g., TODO / DONE symbols)
- Optional user-provided OpenAI API key

All stored data remains **entirely on the user’s local device** and is not accessible to the developer.

---

## 3. External Services (OpenAI)

The extension includes optional features that interact with the OpenAI API.

- Text is sent to the OpenAI API **only when explicitly triggered by the user**
  (e.g., when requesting a content review).
- No data is transmitted automatically or in the background.
- The developer does not log, collect, or store any content sent to OpenAI.

Use of the OpenAI API is subject to OpenAI’s own privacy policy and terms of service.

---

## 4. API Keys

- OpenAI API keys are provided and managed by the user.
- API keys are stored locally using `chrome.storage.local`.
- The developer does not collect, receive, or store API keys.

---

## 5. LabPay (lab-internal service)

For members of the lab's own service LabPay (`pay.nkmr.io`), the extension reads the user's balance, check-in streak, current lab occupancy, shared timers, and upcoming conference deadlines, and displays them in the Scrapbox panels.

- The access permission for `pay.nkmr.io` is optional and is requested only when a lab member explicitly enables the LabPay integration; other users are never asked for it.
- Only four read-only LabPay endpoints are requested; nothing is written to LabPay.
- Requests use the user's existing LabPay login in the browser; the extension stores no LabPay credentials.
- The data is displayed only and kept in memory for up to one minute; it is not stored or sent elsewhere.

---

## 6. Data Sharing

The extension does not sell, transfer, or share user data with third parties, except for direct communication with the OpenAI API initiated by the user and the read-only LabPay requests described above.

---

## 7. Scope of Use

This extension operates solely within the context of Scrapbox and is intended for research support purposes only.  
It does not perform any unrelated actions or access data outside of this scope.

---

## 8. Contact

For questions regardin
