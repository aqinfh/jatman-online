import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';

const schema = await (await fetch('https://schemas.wp.org/trunk/theme.json')).json();
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const ok = validate(JSON.parse(readFileSync('theme/jatman/theme.json', 'utf8')));
if (!ok) {
  for (const e of validate.errors) console.error(`${e.instancePath || '/'} ${e.message}`);
  process.exitCode = 1;
} else {
  console.log('theme.json valid');
}
