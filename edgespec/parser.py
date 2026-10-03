"""
Multi-format specification parser.
Supports JSON Schemas, Gherkin BDD, API Endpoint definitions, and free-form User Stories.
"""

import json
import re
from typing import List, Tuple
from edgespec.models import ExtractedParam, ParamType, SpecFormat


class SpecParser:
    @staticmethod
    def detect_format(raw_text: str) -> SpecFormat:
        stripped = raw_text.strip()
        if (stripped.startswith("{") and stripped.endswith("}")) or (stripped.startswith("[") and stripped.endswith("]")):
            try:
                json.loads(stripped)
                return SpecFormat.JSON_SCHEMA
            except Exception:
                pass

        if re.search(r"^\s*(Feature:|Scenario:|Given |When |Then |And )", stripped, re.MULTILINE | re.IGNORECASE):
            return SpecFormat.GHERKIN

        if re.search(r"\b(GET|POST|PUT|PATCH|DELETE)\s+/[a-zA-Z0-9_\-/{}]*", stripped, re.IGNORECASE):
            return SpecFormat.API_SPEC

        return SpecFormat.USER_STORY

    @classmethod
    def parse(cls, raw_text: str) -> Tuple[SpecFormat, List[ExtractedParam]]:
        spec_format = cls.detect_format(raw_text)
        params: List[ExtractedParam] = []

        if spec_format == SpecFormat.JSON_SCHEMA:
            params = cls._parse_json_schema(raw_text)
        elif spec_format == SpecFormat.GHERKIN:
            params = cls._parse_gherkin(raw_text)
        elif spec_format == SpecFormat.API_SPEC:
            params = cls._parse_api_spec(raw_text)
        else:
            params = cls._parse_user_story(raw_text)

        # Fallback if no parameters extracted
        if not params:
            params.append(
                ExtractedParam(
                    name="inputPayload",
                    param_type=ParamType.STRING,
                    required=True,
                    min_length=1,
                    max_length=1000,
                    description="General input payload inferred from feature description",
                )
            )

        return spec_format, params

    @classmethod
    def _parse_json_schema(cls, text: str) -> List[ExtractedParam]:
        params: List[ExtractedParam] = []
        try:
            data = json.loads(text.strip())
            properties = data.get("properties", {})
            required_fields = set(data.get("required", []))

            for prop_name, prop_data in properties.items():
                p_type_str = prop_data.get("type", "string").lower()
                fmt = prop_data.get("format", "").lower()

                param_type = ParamType.STRING
                if p_type_str in ["integer", "int"]:
                    param_type = ParamType.INTEGER
                elif p_type_str in ["number", "float"]:
                    param_type = ParamType.FLOAT
                elif p_type_str == "boolean":
                    param_type = ParamType.BOOLEAN
                elif p_type_str == "array":
                    param_type = ParamType.ARRAY
                elif p_type_str == "object":
                    param_type = ParamType.OBJECT
                elif fmt == "email":
                    param_type = ParamType.EMAIL
                elif fmt == "uuid":
                    param_type = ParamType.UUID
                elif fmt in ["date", "date-time"]:
                    param_type = ParamType.DATE

                params.append(
                    ExtractedParam(
                        name=prop_name,
                        param_type=param_type,
                        required=(prop_name in required_fields),
                        min_value=prop_data.get("minimum"),
                        max_value=prop_data.get("maximum"),
                        min_length=prop_data.get("minLength"),
                        max_length=prop_data.get("maxLength"),
                        allowed_values=prop_data.get("enum"),
                        description=prop_data.get("description", f"JSON property '{prop_name}'"),
                    )
                )
        except Exception:
            pass
        return params

    @classmethod
    def _parse_api_spec(cls, text: str) -> List[ExtractedParam]:
        params: List[ExtractedParam] = []
        lines = text.splitlines()

        for line in lines:
            line_str = line.strip()
            # Match parameter bullet points like "- avatarFile: File (required). Max file size: 5MB"
            # or "- cropX: integer (min: 0, max: 4096)"
            m = re.match(r"^[-*]\s*([a-zA-Z0-9_\-]+)\s*[:=]\s*([a-zA-Z0-9_\-]+)(.*)", line_str)
            if m:
                name, raw_type, rest = m.groups()
                name = name.strip()
                raw_type = raw_type.lower().strip()
                rest = rest.lower()

                param_type = ParamType.STRING
                if "int" in raw_type:
                    param_type = ParamType.INTEGER
                elif "float" in raw_type or "number" in raw_type:
                    param_type = ParamType.FLOAT
                elif "file" in raw_type or "image" in raw_type or "media" in raw_type:
                    param_type = ParamType.FILE
                elif "bool" in raw_type:
                    param_type = ParamType.BOOLEAN
                elif "email" in raw_type:
                    param_type = ParamType.EMAIL

                required = "required" in rest or "optional" not in rest
                min_val = None
                max_val = None
                min_len = None
                max_len = None
                max_bytes = None

                # Extract min / max
                min_m = re.search(r"min(?:imum)?[:=\s]+(\d+(?:\.\d+)?)", rest)
                if min_m:
                    min_val = float(min_m.group(1))

                max_m = re.search(r"max(?:imum)?[:=\s]+(\d+(?:\.\d+)?)", rest)
                if max_m:
                    max_val = float(max_m.group(1))

                # File size
                if "5mb" in rest or "5,242,880" in rest:
                    max_bytes = 5242880
                elif "10mb" in rest:
                    max_bytes = 10485760

                # Max length
                len_m = re.search(r"max(?:imum)?\s*(?:length)?[:=\s]+(\d+)\s*(?:char|character)", rest)
                if len_m:
                    max_len = int(len_m.group(1))

                params.append(
                    ExtractedParam(
                        name=name,
                        param_type=param_type,
                        required=required,
                        min_value=min_val,
                        max_value=max_val,
                        min_length=min_len,
                        max_length=max_len,
                        max_file_size_bytes=max_bytes,
                        description=line_str.lstrip("-* ").strip(),
                    )
                )

        if not params:
            params = cls._parse_text_heuristics(text)
        return params

    @classmethod
    def _parse_gherkin(cls, text: str) -> List[ExtractedParam]:
        params: List[ExtractedParam] = []

        # Find quantity
        qty_m = re.search(r"quantity\s+(\d+)", text, re.IGNORECASE)
        if qty_m:
            params.append(
                ExtractedParam(
                    name="quantity",
                    param_type=ParamType.INTEGER,
                    required=True,
                    min_value=1,
                    max_value=100,
                    description="Cart checkout item quantity",
                )
            )

        # Find currency / total
        price_m = re.search(r"\$(\d+(?:\.\d{2})?)", text)
        if price_m:
            params.append(
                ExtractedParam(
                    name="cartTotal",
                    param_type=ParamType.CURRENCY,
                    required=True,
                    min_value=0.01,
                    max_value=10000.00,
                    description="Subtotal or cart total value",
                )
            )

        # Find payment token
        tok_m = re.search(r'token\s+"([^"]+)"', text, re.IGNORECASE)
        if tok_m:
            params.append(
                ExtractedParam(
                    name="paymentToken",
                    param_type=ParamType.STRING,
                    required=True,
                    min_length=10,
                    max_length=256,
                    description="Card or checkout payment authentication token",
                )
            )

        # Find customer ID or SKU
        id_m = re.search(r'customer with ID\s+"([^"]+)"', text, re.IGNORECASE)
        if id_m:
            params.append(
                ExtractedParam(
                    name="customerId",
                    param_type=ParamType.STRING,
                    required=True,
                    min_length=3,
                    max_length=64,
                    description="Authenticated customer unique identifier",
                )
            )

        if not params:
            params = cls._parse_text_heuristics(text)
        return params

    @classmethod
    def _parse_user_story(cls, text: str) -> List[ExtractedParam]:
        return cls._parse_text_heuristics(text)

    @classmethod
    def _parse_text_heuristics(cls, text: str) -> List[ExtractedParam]:
        params: List[ExtractedParam] = []

        # 1. Money / transfer amount ranges (e.g., between $1.00 and $5,000.00)
        money_range_m = re.search(r"between\s+\$?([\d,]+(?:\.\d+)?)\s+and\s+\$?([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
        if money_range_m:
            min_raw = float(money_range_m.group(1).replace(",", "").rstrip("."))
            max_raw = float(money_range_m.group(2).replace(",", "").rstrip("."))
            params.append(
                ExtractedParam(
                    name="transferAmount",
                    param_type=ParamType.CURRENCY,
                    required=True,
                    min_value=min_raw,
                    max_value=max_raw,
                    description=f"Transaction funds amount ranging from ${min_raw:,.2f} to ${max_raw:,.2f}",
                )
            )
        elif re.search(r"(amount|price|balance|funds|total)", text, re.IGNORECASE):
            params.append(
                ExtractedParam(
                    name="amount",
                    param_type=ParamType.CURRENCY,
                    required=True,
                    min_value=0.01,
                    max_value=10000.0,
                    description="Monetary transaction amount",
                )
            )

        # 2. Email detection
        if re.search(r"(email|e-mail|recipient email)", text, re.IGNORECASE):
            params.append(
                ExtractedParam(
                    name="recipientEmail",
                    param_type=ParamType.EMAIL,
                    required=True,
                    min_length=5,
                    max_length=254,
                    description="Recipient user contact email address",
                )
            )

        # 3. Memo or description
        memo_m = re.search(r"(memo|notes?|description|comment).*?(\d+)\s*(?:char|character)", text, re.IGNORECASE)
        if memo_m:
            max_len = int(memo_m.group(2))
            params.append(
                ExtractedParam(
                    name="transferMemo",
                    param_type=ParamType.STRING,
                    required=False,
                    min_length=0,
                    max_length=max_len,
                    description=f"Optional user note or memo up to {max_len} characters",
                )
            )
        elif re.search(r"(memo|message|comment)", text, re.IGNORECASE):
            params.append(
                ExtractedParam(
                    name="memo",
                    param_type=ParamType.STRING,
                    required=False,
                    min_length=0,
                    max_length=255,
                    description="Optional text message or note",
                )
            )

        # 4. Auth token or Idempotency Key
        if re.search(r"(idempotency|idempotency-key)", text, re.IGNORECASE):
            params.append(
                ExtractedParam(
                    name="Idempotency-Key",
                    param_type=ParamType.UUID,
                    required=True,
                    min_length=16,
                    max_length=64,
                    description="Unique client-generated idempotency request identifier header",
                )
            )

        if re.search(r"(jwt|bearer|token|auth)", text, re.IGNORECASE):
            params.append(
                ExtractedParam(
                    name="Authorization",
                    param_type=ParamType.STRING,
                    required=True,
                    min_length=20,
                    max_length=1024,
                    description="Bearer JWT user authentication token header",
                )
            )

        # 5. Daily limit cap
        cap_m = re.search(r"(?:daily|monthly|cumulative)\s*(?:transfer)?\s*cap[^\$]*\$?([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
        if cap_m:
            cap_val = float(cap_m.group(1).replace(",", "").rstrip("."))
            params.append(
                ExtractedParam(
                    name="dailyCumulativeTotal",
                    param_type=ParamType.CURRENCY,
                    required=True,
                    min_value=0.0,
                    max_value=cap_val,
                    description=f"Daily cumulative limit threshold capped at ${cap_val:,.2f}",
                )
            )

        return params
