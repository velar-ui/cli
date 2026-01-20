import fs from 'fs';

export function writeVelarConfig(config: any) {
  fs.writeFileSync('velar.json', JSON.stringify(config, null, 2) + '\n', 'utf8');
}

export function readVelarConfig(): any | null {
  if (!fs.existsSync('velar.json')) {
    return null;
  }
  return JSON.parse(fs.readFileSync('velar.json', 'utf8'));
}

export function updateVelarConfig(updates: any) {
  const config = readVelarConfig() || {};
  const newConfig = { ...config, ...updates };
  writeVelarConfig(newConfig);
}

export function deleteVelarConfig() {
  if (fs.existsSync('velar.json')) {
    fs.unlinkSync('velar.json');
  }
}