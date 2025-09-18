// Basic integration test for @rdcp/otel-plugin
// Tests the core functionality without complex mocking

describe('@rdcp/otel-plugin Integration', () => {
  it('exports all expected functions and classes', () => {
    const plugin = require('../dist/index.js')
    
    expect(plugin.OpenTelemetryProvider).toBeDefined()
    expect(plugin.setupRDCPWithOpenTelemetry).toBeDefined()
    expect(plugin.disableRDCPOpenTelemetry).toBeDefined()
    expect(plugin.isRDCPOpenTelemetryActive).toBeDefined()
    expect(plugin.createOpenTelemetryProvider).toBeDefined()
  })

  it('has correct package metadata', () => {
    const plugin = require('../dist/index.js')
    
    expect(plugin.RDCP_OTEL_PLUGIN_VERSION).toBe('1.0.0')
    expect(plugin.RDCP_OTEL_PLUGIN_NAME).toBe('@rdcp/otel-plugin')
  })

  it('default export includes all expected functions', () => {
    const plugin = require('../dist/index.js')
    const defaultExport = plugin.default
    
    expect(defaultExport.OpenTelemetryProvider).toBeDefined()
    expect(defaultExport.setupRDCPWithOpenTelemetry).toBeDefined()
    expect(defaultExport.disableRDCPOpenTelemetry).toBeDefined()
    expect(defaultExport.isRDCPOpenTelemetryActive).toBeDefined()
    expect(defaultExport.createOpenTelemetryProvider).toBeDefined()
    expect(defaultExport.version).toBe('1.0.0')
    expect(defaultExport.name).toBe('@rdcp/otel-plugin')
  })

  it('OpenTelemetryProvider can be instantiated', () => {
    const { OpenTelemetryProvider } = require('../dist/index.js')
    
    expect(() => {
      const provider = new OpenTelemetryProvider()
      expect(provider).toBeDefined()
      expect(typeof provider.getCurrentTraceContext).toBe('function')
      expect(typeof provider.isConfigured).toBe('function')
      expect(typeof provider.getProviderInfo).toBe('function')
    }).not.toThrow()
  })

  it('createOpenTelemetryProvider factory function works', () => {
    const { createOpenTelemetryProvider, OpenTelemetryProvider } = require('../dist/index.js')
    
    const provider = createOpenTelemetryProvider()
    expect(provider).toBeInstanceOf(OpenTelemetryProvider)
  })

  it('setup functions exist and can be called without throwing', () => {
    const { 
      setupRDCPWithOpenTelemetry,
      disableRDCPOpenTelemetry,
      isRDCPOpenTelemetryActive
    } = require('../dist/index.js')
    
    // These should not throw even if OpenTelemetry isn't configured
    expect(() => {
      setupRDCPWithOpenTelemetry({ enableTraceCorrelation: false })
    }).not.toThrow()
    
    expect(() => {
      disableRDCPOpenTelemetry()
    }).not.toThrow()
    
    expect(() => {
      const isActive = isRDCPOpenTelemetryActive()
      expect(typeof isActive).toBe('boolean')
    }).not.toThrow()
  })
})