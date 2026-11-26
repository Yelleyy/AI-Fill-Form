const apiKeyInput = document.getElementById('apiKeyInput');
const modelSelect = document.getElementById('modelSelect');
const customModelInput = document.getElementById('customModelInput');
const loadModelsBtn = document.getElementById('loadModelsBtn');
const saveBtn = document.getElementById('saveBtn');
const fillBtn = document.getElementById('fillBtn');
const statusEl = document.getElementById('status');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

chrome.storage.local.get(['geminiApiKey', 'geminiModel', 'geminiModelList'], (result) => {
    if (result.geminiApiKey) apiKeyInput.value = result.geminiApiKey;
    if (result.geminiModelList && result.geminiModelList.length) {
        renderModels(result.geminiModelList, result.geminiModel);
    } else if (result.geminiModel) {
        renderModels([{ name: result.geminiModel, displayName: result.geminiModel }], result.geminiModel);
    }
});

// ชื่อโมเดลที่จะใช้จริง: ช่องพิมพ์เองมาก่อน ถ้าว่างค่อยใช้ค่าจาก dropdown
function getModelName() {
    const custom = customModelInput.value.trim();
    if (custom) return custom.startsWith('models/') ? custom : `models/${custom}`;
    return modelSelect.value;
}

function shortName(model) {
    return model.replace(/^models\//, '');
}

function renderModels(models, selected) {
    modelSelect.innerHTML = '';
    models.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.name;
        opt.textContent = m.displayName ? `${m.displayName} (${shortName(m.name)})` : shortName(m.name);
        modelSelect.appendChild(opt);
    });
    if (selected && models.some((m) => m.name === selected)) {
        modelSelect.value = selected;
    }
}

loadModelsBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
        statusEl.innerText = '❌ ใส่ API Key ก่อนถึงจะโหลดรายชื่อโมเดลได้';
        return;
    }

    statusEl.innerText = 'กำลังโหลดรายชื่อโมเดล...';
    try {
        // ListModels รองรับ pagination — วนจนครบทุกหน้า
        const models = [];
        let pageToken = '';
        do {
            const url = `${API_BASE}/models?key=${encodeURIComponent(key)}&pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) {
                statusEl.innerText = `❌ ${data.error?.message || res.status}`;
                return;
            }
            models.push(...(data.models || []));
            pageToken = data.nextPageToken || '';
        } while (pageToken);

        // เอาเฉพาะโมเดลที่เรียก generateContent ได้ (ตัดพวก embedding / tts ออก)
        const usable = models
            .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
            .sort((a, b) => a.name.localeCompare(b.name));

        if (!usable.length) {
            statusEl.innerText = '❌ ไม่พบโมเดลที่ใช้ generateContent ได้';
            return;
        }

        const current = getModelName();
        renderModels(usable, current);
        chrome.storage.local.set({ geminiModelList: usable.map((m) => ({ name: m.name, displayName: m.displayName })) });
        statusEl.innerText = `✅ พบ ${usable.length} โมเดล`;
    } catch (e) {
        console.error(e);
        statusEl.innerText = '❌ โหลดรายชื่อโมเดลไม่สำเร็จ';
    }
});

saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    const model = getModelName();
    if (!key) {
        statusEl.innerText = '❌ กรุณาใส่ API Key ก่อนครับ';
        return;
    }
    chrome.storage.local.set({ geminiApiKey: key, geminiModel: model }, () => {
        statusEl.innerText = '✅ บันทึกการตั้งค่าเรียบร้อย!';
        setTimeout(() => (statusEl.innerText = 'พร้อมทำงาน'), 2000);
    });
});

fillBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    const model = getModelName();
    if (!key) {
        statusEl.innerText = '❌ กรุณาใส่ API Key ก่อนครับ';
        return;
    }
    if (!model) {
        statusEl.innerText = '❌ เลือกโมเดลก่อนครับ (กดโหลดรายชื่อโมเดล)';
        return;
    }

    statusEl.innerText = `กำลังคิดด้วย ${shortName(model)}... 🧠`;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript(
        {
            target: { tabId: tab.id },
            func: runAIFiller,
            args: [key, model]
        },
        (results) => {
            if (chrome.runtime.lastError) {
                statusEl.innerText = `❌ ${chrome.runtime.lastError.message}`;
                return;
            }
            const r = results && results[0] && results[0].result;
            statusEl.innerText = r && r.message ? r.message : 'เสร็จแล้ว';
        }
    );
});

async function runAIFiller(API_KEY, MODEL_NAME) {
    const inputs = Array.from(
        document.querySelectorAll(
            'input:not([type="hidden"]):not([type="submit"]):not([type="file"]):not([type="button"]):not([type="reset"]), textarea, select'
        )
    )
        .map((el) => ({
            name: el.name || el.id,
            type: el.type,
            placeholder: el.placeholder || '',
            options:
                el.tagName === 'SELECT'
                    ? Array.from(el.options).map((o) => o.value).filter(Boolean)
                    : undefined
        }))
        .filter((el) => el.name);

    if (inputs.length === 0) {
        return { ok: false, message: '❌ ไม่พบช่องให้กรอกบนหน้านี้' };
    }

    const prompt = `
    คุณคือ QA Engineer นี่คือช่องฟิลด์บนหน้าเว็บ: ${JSON.stringify(inputs)}
    จงสร้างข้อมูลจำลองให้สอดคล้องกับชื่อช่องเพื่อทดสอบระบบ
    ข้อควรระวัง:
    - ตอบเป็น JSON Array เท่านั้น โครงสร้าง: [{"selector": "ชื่อ name หรือ id", "value": "ข้อมูลจำลอง"}]
    - ถ้าช่องมี options ให้เลือกค่าจากใน options เท่านั้น
    - ห้ามมีคำอธิบายอื่นๆ เจือปน
  `;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${MODEL_NAME}:generateContent?key=${encodeURIComponent(API_KEY)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return { ok: false, message: `❌ API: ${data.error?.message || response.status}` };
        }

        const candidate = data.candidates && data.candidates[0];
        const parts = (candidate && candidate.content && candidate.content.parts) || [];
        // บางโมเดลคืนหลาย part (เช่นมี thought) — รวมเฉพาะ part ที่เป็น text
        let aiText = parts
            .filter((p) => typeof p.text === 'string' && !p.thought)
            .map((p) => p.text)
            .join('');

        if (!aiText) {
            return {
                ok: false,
                message: `❌ โมเดลไม่ได้ตอบข้อความ (${candidate?.finishReason || 'ไม่ทราบสาเหตุ'})`
            };
        }

        // ตัด code fence และหยิบเฉพาะส่วนที่เป็น JSON array
        aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const start = aiText.indexOf('[');
        const end = aiText.lastIndexOf(']');
        if (start !== -1 && end > start) aiText = aiText.slice(start, end + 1);

        let mockData;
        try {
            mockData = JSON.parse(aiText);
        } catch (e) {
            console.error('AI raw output:', aiText);
            return { ok: false, message: '❌ โมเดลตอบไม่เป็น JSON (ดู Console)' };
        }
        if (!Array.isArray(mockData)) {
            return { ok: false, message: '❌ โมเดลไม่ได้ตอบเป็น Array' };
        }

        let filled = 0;
        mockData.forEach((item) => {
            if (!item || !item.selector) return;
            let el = document.querySelector(`[name="${CSS.escape(item.selector)}"]`);
            if (!el) {
                try {
                    el = document.getElementById(item.selector);
                } catch (e) { /* ignore */ }
            }
            if (!el || el.type === 'file' || el.disabled) return;

            if (el.type === 'checkbox' || el.type === 'radio') {
                const v = String(item.value).toLowerCase();
                el.checked = !['false', 'no', '0', 'ไม่'].includes(v);
            } else {
                el.value = item.value;
            }
            filled++;

            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });

        return { ok: true, message: `✅ กรอกแล้ว ${filled}/${inputs.length} ช่อง` };
    } catch (error) {
        console.error('AI Error:', error);
        return { ok: false, message: `❌ ${error.message}` };
    }
}
