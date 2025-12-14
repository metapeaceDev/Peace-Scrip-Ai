#!/usr/bin/env python3
"""
Script to add 2-tier tab structure to Step5Output.tsx
This script will modify the SceneDisplay component to support:
1. Main tabs: Scene Design / Simulation / Motion Editor
2. Sub-tabs under Scene Design
3. Psychology Timeline in Simulation tab
"""

import re

def read_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filename, content):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    filename = 'src/components/Step5Output.tsx'
    content = read_file(filename)
    
    # Find and replace the old tab navigation with 2-tier structure
    old_nav_pattern = r'(return \(\s*<div className="mt-4 p-4 bg-gray-900/50[^>]*>\s*)<div className="flex justify-between items-center border-b border-gray-600 mb-4 pb-2">'
    
    new_nav = r'''\1{/* 🎯 Main Tabs Navigation (Level 1) */}
      <div className="flex justify-between items-center border-b-2 border-gray-700 mb-6 pb-0">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMainTab('sceneDesign')}
            title="Access scene configuration, shots, and storyboard (Alt+1)"
            className={`py-3 px-6 font-bold text-base transition-all relative ${
              mainTab === 'sceneDesign'
                ? 'text-cyan-400 bg-gray-800/60'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
            }`}
          >
            📝 Scene Design
            {mainTab === 'sceneDesign' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMainTab('simulation')}
            title="Psychology Timeline (Alt+2)"
            className={`py-3 px-6 font-bold text-base transition-all relative ${
              mainTab === 'simulation'
                ? 'text-purple-400 bg-gray-800/60'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
            }`}
          >
            🎭 Simulation
            {mainTab === 'simulation' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMainTab('motionEditor')}
            title="Motion Editor (Alt+3)"
            className={`py-3 px-6 font-bold text-base transition-all relative ${
              mainTab === 'motionEditor'
                ? 'text-green-400 bg-gray-800/60'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
            }`}
          >
            🎬 Motion Editor
            {mainTab === 'motionEditor' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-teal-500"></div>
            )}
          </button>
        </div>
      </div>

      {/* Scene Design Tab */}
      {mainTab === 'sceneDesign' && (
        <>
          <div className="flex justify-between items-center border-b border-gray-600 mb-4 pb-2">'''
    
    content = re.sub(old_nav_pattern, new_nav, content, count=1)
    
    write_file(filename, content)
    print("✅ 2-tier navigation added successfully!")

if __name__ == '__main__':
    main()
