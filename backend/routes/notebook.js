const express = require('express')
const { spawn } = require('child_process')
const path = require('path')
const router = express.Router()

// Execute Python code in notebook
router.post('/execute', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Code is required' })
    }

    // Create a temporary Python script to execute
    const tempScript = `
import sys
import traceback
import io
from contextlib import redirect_stdout, redirect_stderr

# Capture stdout and stderr
stdout_capture = io.StringIO()
stderr_capture = io.StringIO()

code_to_execute = """${code.replace(/`/g, '\\`').replace(/\$/g, '\\$')}"""

try:
    with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
        # Execute the code
        exec(code_to_execute)
except Exception as e:
    stderr_capture.write(traceback.format_exc())

# Print captured output
stdout_output = stdout_capture.getvalue()
stderr_output = stderr_capture.getvalue()

if stdout_output:
    print(stdout_output, end='')
if stderr_output:
    print("ERROR:", stderr_output, end='', file=sys.stderr)
`

    // Execute the Python code
    const pythonProcess = spawn('python', ['-c', tempScript], {
      cwd: path.join(__dirname, '../../python'),
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let output = ''
    let errorOutput = ''

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        res.json({
          output: output.trim(),
          error: errorOutput.trim() || null
        })
      } else {
        res.json({
          output: output.trim(),
          error: errorOutput.trim() || 'Execution failed'
        })
      }
    })

    pythonProcess.on('error', (err) => {
      res.status(500).json({ error: `Failed to execute code: ${err.message}` })
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router