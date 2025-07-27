# MCP Sphinx Docs

Un servidor MCP (Model Context Protocol) que convierte documentación de Sphinx a Markdown optimizado para consumo por LLMs.

## 🚀 Instalación y uso rápido

### Como herramienta de línea de comandos

```bash
# Convertir documentación desde una URL
npx @zk-armor/mcp-sphinx-docs convert-url https://btrfs.readthedocs.io/en/latest/ ./converted-docs

# Convertir archivos locales
npx @zk-armor/mcp-sphinx-docs convert-local ./docs ./markdown-docs
```

### Como servidor MCP

Agrega a tu configuración MCP (ej. Claude Desktop):

```json
{
  "mcpServers": {
    "mcp-sphinx-docs": {
      "command": "npx",
      "args": ["@zk-armor/mcp-sphinx-docs"]
    }
  }
}
```

## 🚀 Características

- **Conversión RST a Markdown**: Convierte archivos reStructuredText de Sphinx a Markdown limpio
- **Optimización para LLMs**: Aplica transformaciones específicas para mejorar el consumo por modelos de lenguaje
- **Procesamiento por lotes**: Convierte directorios completos de documentación
- **Chunking inteligente**: Divide documentos grandes en chunks apropiados para LLMs
- **Preservación de referencias**: Mantiene enlaces internos y referencias cruzadas
- **Análisis de estructura**: Analiza la estructura de proyectos Sphinx

## 📦 Instalación

### Como dependencia local
```bash
npm install
npm run build
```

### Como paquete global (para usar con npx)
```bash
npm install -g .
# O directamente desde este directorio:
npm link
```

## 🛠️ Uso

### Como servidor MCP

El servidor MCP proporciona las siguientes herramientas:

#### 1. `convert_sphinx_file`
Convierte un archivo RST individual a Markdown.

**Parámetros:**
- `sourcePath` (string, requerido): Ruta al archivo RST
- `outputPath` (string, opcional): Ruta de salida para el archivo Markdown
- `options` (object, opcional):
  - `optimize` (boolean, default: true): Aplicar optimizaciones para LLM
  - `chunkSize` (number, default: 4000): Tamaño máximo de chunk
  - `preserveReferences` (boolean, default: true): Preservar referencias internas

#### 2. `convert_sphinx_directory`
Convierte un directorio completo de documentación Sphinx.

**Parámetros:**
- `sourcePath` (string, requerido): Ruta al directorio de documentación Sphinx
- `outputPath` (string, requerido): Directorio de salida para archivos Markdown
- `options` (object, opcional):
  - `recursive` (boolean, default: true): Procesar subdirectorios
  - `optimize` (boolean, default: true): Aplicar optimizaciones para LLM
  - `chunkSize` (number, default: 4000): Tamaño máximo de chunk
  - `preserveStructure` (boolean, default: true): Preservar estructura de directorios

#### 3. `analyze_sphinx_structure`
Analiza la estructura de un proyecto de documentación Sphinx.

**Parámetros:**
- `sourcePath` (string, requerido): Ruta al directorio de documentación
- `depth` (number, default: 3): Profundidad máxima de análisis

### Como CLI (futuro)

```bash
# Convertir un archivo
npx sphinx-to-llm-markdown convert file.rst output.md

# Convertir un directorio
npx sphinx-to-llm-markdown convert ./docs ./markdown-docs

# Analizar estructura
npx sphinx-to-llm-markdown analyze ./docs
```

## 🏗️ Arquitectura

```
src/
├── index.ts              # Servidor MCP principal
├── converters/
│   └── sphinx-converter.ts  # Lógica de conversión RST → Markdown
├── optimizers/
│   └── llm-optimizer.ts     # Optimizaciones específicas para LLMs
└── utils/
    └── file-handler.ts      # Utilidades para manejo de archivos
```

### Componentes principales

- **SphinxConverter**: Parsea RST y convierte a Markdown
  - Maneja directivas Sphinx (toctree, note, warning, etc.)
  - Convierte referencias cruzadas
  - Preserva estructura de documentos

- **LLMOptimizer**: Optimiza el Markdown para LLMs
  - Simplifica estructura (máximo 4 niveles de headers)
  - Elimina redundancias
  - Añade contexto a secciones
  - Implementa chunking inteligente

- **FileHandler**: Maneja operaciones de archivos
  - Búsqueda recursiva de archivos RST
  - Análisis de estructura de directorios
  - Operaciones de E/S con manejo de errores

## 🧪 Ejemplo de uso

### Probar con documentación BTRFS

```bash
# Clonar la documentación de BTRFS (ejemplo)
git clone https://github.com/kdave/btrfs-progs.git
cd btrfs-progs/Documentation

# Usar el servidor MCP para convertir
# (desde el cliente MCP, como Claude Desktop)
```

### Estructura de entrada típica (Sphinx)
```
docs/
├── conf.py
├── index.rst
├── introduction.rst
├── features/
│   ├── compression.rst
│   └── snapshots.rst
└── _static/
```

### Estructura de salida (Markdown optimizado)
```
markdown-docs/
├── index.md
├── introduction.md
└── features/
    ├── compression.md
    └── snapshots.md
```

## 🔧 Configuración para VS Code

El proyecto incluye configuración para depurar el servidor MCP:

1. **`.vscode/mcp.json`**: Configuración del servidor MCP
2. **`.vscode/tasks.json`**: Tareas de build y watch
3. **`.github/copilot-instructions.md`**: Instrucciones para GitHub Copilot

### Depuración

```bash
# Compilar en modo watch
npm run watch

# En otra terminal, ejecutar el servidor
npm start
```

## 📝 Formatos soportados

### Entrada (RST/Sphinx)
- ✅ Headers con subrayado (=, -, ~, etc.)
- ✅ Listas con bullets y numeración
- ✅ Bloques de código con `::`
- ✅ Directivas básicas (note, warning, tip)
- ✅ Referencias doc (`:doc:`reference`)
- ✅ Referencias internas (`:ref:`reference`)
- ✅ Enlaces externos
- ✅ Énfasis y texto fuerte
- ⚠️ Tablas simples
- ⚠️ Autodoc (básico)

### Salida (Markdown optimizado)
- ✅ Headers normalizados (máximo 4 niveles)
- ✅ Listas con bullets consistentes
- ✅ Bloques de código con hints de lenguaje
- ✅ Blockquotes para notas/warnings
- ✅ Enlaces con texto descriptivo
- ✅ Separadores de sección
- ✅ Contexto agregado para secciones profundas

## 🛣️ Roadmap

### Fase actual: MVP ✅
- [x] Conversión básica RST → Markdown
- [x] Servidor MCP funcional
- [x] Optimizaciones básicas para LLM
- [x] Manejo de archivos y directorios

### Próximas características
- [ ] CLI independiente
- [ ] Soporte mejorado para tablas complejas
- [ ] Procesamiento de autodoc más sofisticado
- [ ] Configuración personalizable
- [ ] Tests automatizados
- [ ] Publicación en NPM

### Futuro
- [ ] Soporte para otros formatos de documentación
- [ ] Integración con APIs de LLM para validación
- [ ] Dashboard web para conversiones
- [ ] Plugins para diferentes frameworks de documentación

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

ISC License - ver archivo LICENSE para detalles.

## 🔗 Enlaces útiles

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Sphinx Documentation](https://www.sphinx-doc.org/)
- [reStructuredText Primer](https://www.sphinx-doc.org/en/master/usage/restructuredtext/basics.html)
- [BTRFS Documentation](https://btrfs.readthedocs.io/) (ejemplo de prueba)
