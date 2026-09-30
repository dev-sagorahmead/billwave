// Bluetooth Thermal Pocket Printer Utility for 58mm/80mm POS Printers
// Supports:
// 1. Direct Web Bluetooth API (ESC/POS over BLE)
// 2. RawBT Android Driver Intent (Universal Bluetooth Print in BD)
// 3. Android System Print Spooler (58mm Roll)

// Standard ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;

export const ESC_POS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x01],
  DOUBLE_WIDTH_ON: [GS, 0x21, 0x10],
  DOUBLE_ON: [GS, 0x21, 0x11],
  NORMAL_TEXT: [GS, 0x21, 0x00],
  FEED_2: [ESC, 0x64, 0x02],
  FEED_4: [ESC, 0x64, 0x04],
  CUT: [GS, 0x56, 0x41, 0x00]
};

// Convert string to ASCII byte array (clean replacement for non-ASCII)
export function stringToBytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 128) {
      bytes.push(code);
    } else {
      // For thermal printers that expect CP437/ASCII, transliterate or space
      bytes.push(0x20); // space or fallback
    }
  }
  return bytes;
}

// Generate ESC/POS byte buffer for a 58mm receipt (32 characters wide)
export function generateEscPosReceipt(receipt, options = {}) {
  const width = options.width || 32; // 32 chars for 58mm, 42 for 80mm
  const divider = '-'.repeat(width);

  const {
    receiptNumber = '',
    company = {},
    customer = {},
    collector = {},
    billingMonth = '',
    previousDue = 0,
    paidAmount = 0,
    remainingDue = 0,
    isAdvance = false,
    advanceAmount = 0,
    paymentDate = '',
    paymentTime = '',
    paymentMethod = 'Cash'
  } = receipt;

  let buffer = [];

  const add = (arr) => {
    buffer.push(...arr);
  };

  const addText = (text, newline = true) => {
    add(stringToBytes(text + (newline ? '\n' : '')));
  };

  const addRow = (left, right) => {
    const l = String(left || '');
    const r = String(right || '');
    const spaces = Math.max(1, width - l.length - r.length);
    addText(l + ' '.repeat(spaces) + r);
  };

  // 1. Initialize
  add(ESC_POS.INIT);

  // 2. Header
  add(ESC_POS.ALIGN_CENTER);
  add(ESC_POS.BOLD_ON);
  add(ESC_POS.DOUBLE_HEIGHT_ON);
  addText(company.name || 'CABLE TV NETWORK');
  add(ESC_POS.NORMAL_TEXT);

  if (company.phone) {
    addText(`Hotline: ${company.phone}`);
  }
  if (company.address) {
    addText(company.address.slice(0, width));
  }

  addText(divider);
  add(ESC_POS.BOLD_ON);
  addText('MONEY RECEIPT');
  add(ESC_POS.BOLD_OFF);
  addText(divider);

  // 3. Meta
  add(ESC_POS.ALIGN_LEFT);
  addRow('Receipt No:', receiptNumber);
  if (billingMonth) {
    addRow('Bill Month:', billingMonth);
  }
  addRow('Date/Time:', `${paymentDate} ${paymentTime || ''}`.trim());
  addRow('Collector:', (collector.name || 'Office').slice(0, 18));
  addText(divider);

  // 4. Customer
  addRow('Cust ID:', customer.customerId || customer.id || '-');
  addRow('Name:', (customer.name || '-').slice(0, 24));
  addRow('Phone:', customer.phone || '-');
  if (customer.area) {
    addRow('Area:', (customer.area || '-').slice(0, 24));
  }
  addText(divider);

  // 5. Billing Details
  addRow('Previous Due:', `${previousDue} BDT`);
  add(ESC_POS.BOLD_ON);
  addRow(`Paid (${paymentMethod}):`, `${paidAmount} BDT`);
  add(ESC_POS.BOLD_OFF);
  addRow('Remaining Due:', `${Math.max(0, remainingDue)} BDT`);

  if (isAdvance || remainingDue < 0) {
    const adv = advanceAmount || Math.abs(remainingDue);
    add(ESC_POS.BOLD_ON);
    addRow('Advance Credit:', `+${adv} BDT`);
    add(ESC_POS.BOLD_OFF);
  }

  addText(divider);

  // 6. Footer
  add(ESC_POS.ALIGN_CENTER);
  addText('Thank you for your payment!');
  addText('Valid without signature.');
  add(ESC_POS.FEED_4);

  return new Uint8Array(buffer);
}

// Global cached bluetooth device connection
let cachedDevice = null;
let cachedCharacteristic = null;

// Connect and print directly using Web Bluetooth API
export async function printDirectWebBluetooth(receipt) {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth is not supported on this browser. Use Chrome on Android or use RawBT / System Print.');
  }

  // Common Bluetooth Thermal Printer Service and Characteristic UUIDs
  const PRINTER_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
    '0000ffe0-0000-1000-8000-00805f9b34fb', // Common BLE Serial (POS-58, MPT-II, PT-210)
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2'  // Star / Generic BLE
  ];

  let characteristic = cachedCharacteristic;

  if (!characteristic || !cachedDevice || !cachedDevice.gatt.connected) {
    // Request Bluetooth Device
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
        { services: ['0000ffe0-0000-1000-8000-00805f9b34fb'] },
        { namePrefix: 'POS' },
        { namePrefix: 'MPT' },
        { namePrefix: 'RPP' },
        { namePrefix: 'PT' },
        { namePrefix: 'MTP' },
        { namePrefix: 'InnerPrinter' },
        { namePrefix: 'Bluetooth' }
      ],
      optionalServices: PRINTER_SERVICES
    });

    cachedDevice = device;
    const server = await device.gatt.connect();

    // Find printable characteristic
    for (const serviceUuid of PRINTER_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            characteristic = char;
            cachedCharacteristic = char;
            break;
          }
        }
        if (characteristic) break;
      } catch (err) {
        // Try next service
      }
    }
  }

  if (!characteristic) {
    throw new Error('Could not find write characteristic on the Bluetooth printer.');
  }

  const rawBytes = generateEscPosReceipt(receipt, { width: 32 });

  // Send in chunks of 50 bytes (BLE MTU friendly)
  const CHUNK_SIZE = 50;
  for (let i = 0; i < rawBytes.length; i += CHUNK_SIZE) {
    const chunk = rawBytes.slice(i, i + CHUNK_SIZE);
    if (characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
  }

  return true;
}

// Print via RawBT Android App Intent (Universal support for all Bluetooth thermal printers in BD)
export function printViaRawBT(receipt) {
  const rawBytes = generateEscPosReceipt(receipt, { width: 32 });
  
  // Convert bytes to base64
  let binary = '';
  for (let i = 0; i < rawBytes.byteLength; i++) {
    binary += String.fromCharCode(rawBytes[i]);
  }
  const base64Data = btoa(binary);

  // RawBT Intent URL
  const rawbtUrl = `rawbt:data:application/octet-stream;base64,${base64Data}`;
  
  // Launch RawBT or fallback
  window.location.href = rawbtUrl;
}

// Check if Auto-Print is enabled in localStorage
export function isAutoPrintEnabled() {
  try {
    return localStorage.getItem('dish_auto_print_bluetooth') === 'true';
  } catch (e) {
    return false;
  }
}

export function setAutoPrintEnabled(enabled) {
  try {
    localStorage.setItem('dish_auto_print_bluetooth', enabled ? 'true' : 'false');
  } catch (e) {}
}
