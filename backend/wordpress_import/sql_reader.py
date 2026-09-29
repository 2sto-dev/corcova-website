"""Read MySQL dump INSERT values as data, without executing SQL or PHP.

Only the explicitly allowed WordPress tables are parsed. Accounts, options,
sessions and plugin settings are never loaded into the new application.
"""
import re

TABLE_COLUMNS = {
    'posts': ['ID', 'post_author', 'post_date', 'post_date_gmt', 'post_content', 'post_title', 'post_excerpt', 'post_status', 'comment_status', 'ping_status', 'post_password', 'post_name', 'to_ping', 'pinged', 'post_modified', 'post_modified_gmt', 'post_content_filtered', 'post_parent', 'guid', 'menu_order', 'post_type', 'post_mime_type', 'comment_count'],
    'postmeta': ['meta_id', 'post_id', 'meta_key', 'meta_value'],
    'terms': ['term_id', 'name', 'slug', 'term_group'],
    'term_taxonomy': ['term_taxonomy_id', 'term_id', 'taxonomy', 'description', 'parent', 'count'],
    'term_relationships': ['object_id', 'term_taxonomy_id', 'term_order'],
}


def statements(stream):
    buffer, quoted, escaped = [], False, False
    for line in stream:
        if not buffer and (not line.strip() or line.lstrip().startswith(('--', '/*', '#'))):
            continue
        for char in line:
            buffer.append(char)
            if escaped:
                escaped = False
            elif char == '\\' and quoted:
                escaped = True
            elif char == "'":
                quoted = not quoted
            elif char == ';' and not quoted:
                yield ''.join(buffer).strip()
                buffer = []
        if buffer and not ''.join(buffer).strip():
            buffer = []


def read_tables(path, prefix='wp_'):
    tables = {name: [] for name in TABLE_COLUMNS}
    pattern = re.compile(r"'((?:[^'\\]|\\.|'')*)'|(-?\d+(?:\.\d+)?)|\b(NULL)\b|([(),;])", re.S)
    with open(path, encoding='utf-8-sig') as stream:
        for statement in statements(stream):
            match = re.match(r'INSERT\s+INTO\s+`([^`]+)`\s*(\([^)]*\))?\s+VALUES\s*(.*)', statement, re.S|re.I)
            if not match or not match[1].startswith(prefix):
                continue
            name = match[1][len(prefix):]
            if name not in TABLE_COLUMNS:
                continue
            columns = re.findall(r'`([^`]+)`', match[2]) if match[2] else TABLE_COLUMNS[name]
            row = []
            for token in pattern.finditer(match[3]):
                if token[4] == '(':
                    row = []
                elif token[4] == ')':
                    if len(row) != len(columns):
                        raise ValueError(f'Unexpected column count in {name}: {len(row)}')
                    tables[name].append(dict(zip(columns, row)))
                elif token[1] is not None:
                    value = re.sub(r'\\(.)', lambda m: {'n':'\n', 'r':'\r', 't':'\t', '0':'\0'}.get(m[1], m[1]), token[1], flags=re.S)
                    row.append(value.replace("''", "'"))
                elif token[2] is not None:
                    row.append(int(token[2]) if '.' not in token[2] else float(token[2]))
                elif token[3]:
                    row.append(None)
    return tables
