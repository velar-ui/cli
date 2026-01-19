import fs from 'fs';

export function writeVelarConfig(config: any) {
  fs.writeFileSync('velar.json', JSON.stringify(config, null, 2) + '\n', 'utf8');
}
