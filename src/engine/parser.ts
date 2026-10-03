import { ExtractedParam, ParamType, SpecFormat } from '../types';

export function detectSpecFormat(rawText: string): SpecFormat {
  const stripped = rawText.trim();
  if (
    (stripped.startsWith('{') && stripped.endsWith('}')) ||
    (stripped.startsWith('[') && stripped.endsWith(']'))
  ) {
    try {
      JSON.parse(stripped);
      return 'json_schema';
    } catch {
      // ignore
    }
  }

  if (/^\s*(Feature:|Scenario:|Given |When |Then |And )/im.test(stripped)) {
    return 'gherkin';
  }

  if (/\b(GET|POST|PUT|PATCH|DELETE)\s+\/[a-zA-Z0-9_\-/{}]*/i.test(stripped)) {
    return 'api_spec';
  }

  return 'user_story';
}

export function parseSpec(rawText: string): {
  format: SpecFormat;
  parameters: ExtractedParam[];
} {
  const format = detectSpecFormat(rawText);
  let params: ExtractedParam[] = [];

  if (format === 'json_schema') {
    params = parseJsonSchema(rawText);
  } else if (format === 'api_spec') {
    params = parseApiSpec(rawText);
  } else if (format === 'gherkin') {
    params = parseGherkin(rawText);
  } else {
    params = parseTextHeuristics(rawText);
  }

  if (params.length === 0) {
    params.push({
      name: 'inputPayload',
      paramType: 'string',
      required: true,
      minLength: 1,
      maxLength: 1000,
      description: 'General input payload inferred from feature description',
    });
  }

  return { format, parameters: params };
}

function parseJsonSchema(text: string): ExtractedParam[] {
  const params: ExtractedParam[] = [];
  try {
    const data = JSON.parse(text.trim());
    const properties = data.properties || {};
    const requiredSet = new Set(data.required || []);

    for (const [propName, propData] of Object.entries<any>(properties)) {
      const typeStr = (propData.type || 'string').toLowerCase();
      const fmt = (propData.format || '').toLowerCase();

      let paramType: ParamType = 'string';
      if (typeStr === 'integer' || typeStr === 'int') paramType = 'integer';
      else if (typeStr === 'number' || typeStr === 'float') paramType = 'float';
      else if (typeStr === 'boolean') paramType = 'boolean';
      else if (typeStr === 'array') paramType = 'array';
      else if (typeStr === 'object') paramType = 'object';
      else if (fmt === 'email') paramType = 'email';
      else if (fmt === 'uuid') paramType = 'uuid';
      else if (fmt === 'date' || fmt === 'date-time') paramType = 'date';

      params.push({
        name: propName,
        paramType,
        required: requiredSet.has(propName),
        minValue: typeof propData.minimum === 'number' ? propData.minimum : undefined,
        maxValue: typeof propData.maximum === 'number' ? propData.maximum : undefined,
        minLength: typeof propData.minLength === 'number' ? propData.minLength : undefined,
        maxLength: typeof propData.maxLength === 'number' ? propData.maxLength : undefined,
        allowedValues: Array.isArray(propData.enum) ? propData.enum : undefined,
        description: propData.description || `JSON property '${propName}'`,
      });
    }
  } catch {
    // fallback
  }
  return params;
}

function parseApiSpec(text: string): ExtractedParam[] {
  const params: ExtractedParam[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const lineStr = line.trim();
    const match = lineStr.match(/^[-*]\s*([a-zA-Z0-9_\-]+)\s*[:=]\s*([a-zA-Z0-9_\-]+)(.*)/i);
    if (match) {
      const [, name, rawType, restRaw] = match;
      const t = rawType.toLowerCase();
      const rest = restRaw.toLowerCase();

      let paramType: ParamType = 'string';
      if (t.includes('int')) paramType = 'integer';
      else if (t.includes('float') || t.includes('number')) paramType = 'float';
      else if (t.includes('file') || t.includes('image') || t.includes('media')) paramType = 'file';
      else if (t.includes('bool')) paramType = 'boolean';
      else if (t.includes('email')) paramType = 'email';

      let minValue: number | undefined;
      let maxValue: number | undefined;
      let minLength: number | undefined;
      let maxLength: number | undefined;
      let maxFileSizeBytes: number | undefined;

      const minM = rest.match(/min(?:imum)?[:=\s]+(\d+(?:\.\d+)?)/);
      if (minM) minValue = parseFloat(minM[1]);

      const maxM = rest.match(/max(?:imum)?[:=\s]+(\d+(?:\.\d+)?)/);
      if (maxM) maxValue = parseFloat(maxM[1]);

      if (rest.includes('5mb') || rest.includes('5,242,880')) {
        maxFileSizeBytes = 5242880;
      } else if (rest.includes('10mb')) {
        maxFileSizeBytes = 10485760;
      }

      const lenM = rest.match(/max(?:imum)?\s*(?:length)?[:=\s]+(\d+)\s*(?:char|character)/);
      if (lenM) maxLength = parseInt(lenM[1], 10);

      params.push({
        name,
        paramType,
        required: rest.includes('required') || !rest.includes('optional'),
        minValue,
        maxValue,
        minLength,
        maxLength,
        maxFileSizeBytes,
        description: lineStr.replace(/^[-*]\s*/, ''),
      });
    }
  }

  if (params.length === 0) {
    return parseTextHeuristics(text);
  }
  return params;
}

function parseGherkin(text: string): ExtractedParam[] {
  const params: ExtractedParam[] = [];

  const qtyMatch = text.match(/quantity\s+(\d+)/i);
  if (qtyMatch) {
    params.push({
      name: 'quantity',
      paramType: 'integer',
      required: true,
      minValue: 1,
      maxValue: 100,
      description: 'Cart checkout item quantity',
    });
  }

  const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  if (priceMatch) {
    params.push({
      name: 'cartTotal',
      paramType: 'currency',
      required: true,
      minValue: 0.01,
      maxValue: 10000.0,
      description: 'Cart total checkout value',
    });
  }

  const tokMatch = text.match(/token\s+"([^"]+)"/i);
  if (tokMatch) {
    params.push({
      name: 'paymentToken',
      paramType: 'string',
      required: true,
      minLength: 10,
      maxLength: 256,
      description: 'Card or checkout payment authentication token',
    });
  }

  const custMatch = text.match(/customer with ID\s+"([^"]+)"/i);
  if (custMatch) {
    params.push({
      name: 'customerId',
      paramType: 'string',
      required: true,
      minLength: 3,
      maxLength: 64,
      description: 'Authenticated customer unique identifier',
    });
  }

  if (params.length === 0) {
    return parseTextHeuristics(text);
  }
  return params;
}

function parseTextHeuristics(text: string): ExtractedParam[] {
  const params: ExtractedParam[] = [];

  // 1. Money range
  const rangeMatch = text.match(/between\s+\$?([\d,]+(?:\.\d+)?)\s+and\s+\$?([\d,]+(?:\.\d+)?)/i);
  if (rangeMatch) {
    const minVal = parseFloat(rangeMatch[1].replace(/,/g, ''));
    const maxVal = parseFloat(rangeMatch[2].replace(/,/g, ''));
    params.push({
      name: 'transferAmount',
      paramType: 'currency',
      required: true,
      minValue: minVal,
      maxValue: maxVal,
      description: `Transaction amount ranging from $${minVal.toLocaleString()} to $${maxVal.toLocaleString()}`,
    });
  } else if (/(amount|price|balance|funds|total)/i.test(text)) {
    params.push({
      name: 'amount',
      paramType: 'currency',
      required: true,
      minValue: 0.01,
      maxValue: 10000.0,
      description: 'Monetary transaction amount',
    });
  }

  // 2. Email
  if (/(email|e-mail|recipient email)/i.test(text)) {
    params.push({
      name: 'recipientEmail',
      paramType: 'email',
      required: true,
      minLength: 5,
      maxLength: 254,
      description: 'Recipient user contact email address',
    });
  }

  // 3. Memo
  const memoMatch = text.match(/(memo|notes?|description|comment).*?(\d+)\s*(?:char|character)/i);
  if (memoMatch) {
    const maxLen = parseInt(memoMatch[2], 10);
    params.push({
      name: 'transferMemo',
      paramType: 'string',
      required: false,
      minLength: 0,
      maxLength: maxLen,
      description: `Optional user note or memo up to ${maxLen} characters`,
    });
  } else if (/(memo|message|comment)/i.test(text)) {
    params.push({
      name: 'memo',
      paramType: 'string',
      required: false,
      minLength: 0,
      maxLength: 255,
      description: 'Optional text message or note',
    });
  }

  // 4. Idempotency Key
  if (/(idempotency|idempotency-key)/i.test(text)) {
    params.push({
      name: 'Idempotency-Key',
      paramType: 'uuid',
      required: true,
      minLength: 16,
      maxLength: 64,
      description: 'Unique client-generated idempotency request identifier header',
    });
  }

  // 5. Auth
  if (/(jwt|bearer|token|auth)/i.test(text)) {
    params.push({
      name: 'Authorization',
      paramType: 'string',
      required: true,
      minLength: 20,
      maxLength: 1024,
      description: 'Bearer JWT user authentication token header',
    });
  }

  // 6. Cumulative cap
  const capMatch = text.match(/(?:daily|monthly|cumulative)\s*(?:transfer)?\s*cap[^\$]*\$?([\d,]+(?:\.\d+)?)/i);
  if (capMatch) {
    const capVal = parseFloat(capMatch[1].replace(/,/g, ''));
    params.push({
      name: 'dailyCumulativeTotal',
      paramType: 'currency',
      required: true,
      minValue: 0.0,
      maxValue: capVal,
      description: `Daily cumulative limit threshold capped at $${capVal.toLocaleString()}`,
    });
  }

  return params;
}
