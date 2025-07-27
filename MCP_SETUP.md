# Configuración del Cliente MCP

## Claude Desktop

Para usar este servidor MCP con Claude Desktop, añade lo siguiente a tu archivo de configuración:

### macOS
`~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows  
`%APPDATA%/Claude/claude_desktop_config.json`

### Linux
`~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sphinx-to-llm-markdown": {
      "command": "node",
      "args": ["[RUTA_COMPLETA_AL_PROYECTO]/dist/index.js"]
    }
  }
}
```

## Otros clientes MCP

### Configuración genérica

```json
{
  "name": "sphinx-to-llm-markdown",
  "description": "Convert Sphinx documentation to LLM-optimized Markdown",
  "transport": {
    "type": "stdio",
    "command": "node",
    "args": ["[RUTA_AL_PROYECTO]/dist/index.js"]
  }
}
```

### Variables de entorno (opcional)

```bash
export SPHINX_MCP_LOG_LEVEL=info
export SPHINX_MCP_CHUNK_SIZE=4000
```

## Verificación

Para verificar que el servidor está funcionando:

1. Inicia tu cliente MCP
2. Verifica que la herramienta `sphinx-to-llm-markdown` esté disponible
3. Prueba con un archivo RST simple

## Ejemplo de uso en cliente

```
Convierte el archivo /path/to/docs/index.rst a Markdown optimizado para LLM
```

El servidor responderá con:
- El contenido convertido
- Confirmación de archivos guardados (si se especifica ruta de salida)
- Mensajes de error si algo falla

## Solución de problemas

### El servidor no inicia
- Verifica que Node.js esté instalado (versión 16+)
- Asegúrate de que el proyecto esté compilado (`npm run build`)
- Verifica que la ruta en la configuración sea correcta

### Error de permisos
- Asegúrate de que el usuario tenga permisos de lectura en los archivos RST
- Verifica permisos de escritura en el directorio de salida

### Conversión incompleta
- Revisa que los archivos RST tengan codificación UTF-8
- Verifica que no haya caracteres especiales problemáticos
