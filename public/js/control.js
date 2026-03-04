/**
 * OBS Timer Control Panel
 */

(function() {
  const timer = getTimer();

  if (!timer) {
    window.location.href = '/?error=missing_timer';
    return;
  }

  // Elements
  const channelName = document.getElementById('channel-name');
  const timerPreview = document.getElementById('timer-preview');
  const obsUrlInput = document.getElementById('obs-url');

  // Timer controls
  const btnStart = document.getElementById('btn-start');
  const btnStop = document.getElementById('btn-stop');
  const btnReset = document.getElementById('btn-reset');
  const btnUpdateDuration = document.getElementById('btn-update-duration');
  const durationInput = document.getElementById('duration');
  const modeSelect = document.getElementById('mode');
  const endBehaviorSelect = document.getElementById('end-behavior');
  const formatSelect = document.getElementById('format');

  // Styling controls
  const fontFamilySelect = document.getElementById('font-family');
  const fontWeightSelect = document.getElementById('font-weight');
  const fontSizeSlider = document.getElementById('font-size');
  const fontSizeDisplay = document.getElementById('font-size-display');
  const textColorPicker = document.getElementById('text-color-picker');
  const textColorInput = document.getElementById('text-color');

  const shadowEnabled = document.getElementById('shadow-enabled');
  const shadowControls = document.getElementById('shadow-controls');
  const shadowColorPicker = document.getElementById('shadow-color-picker');
  const shadowColorInput = document.getElementById('shadow-color');
  const shadowBlurSlider = document.getElementById('shadow-blur');
  const shadowOffsetXSlider = document.getElementById('shadow-offset-x');
  const shadowOffsetYSlider = document.getElementById('shadow-offset-y');

  const strokeEnabled = document.getElementById('stroke-enabled');
  const strokeControls = document.getElementById('stroke-controls');
  const strokeColorPicker = document.getElementById('stroke-color-picker');
  const strokeColorInput = document.getElementById('stroke-color');
  const strokeWidthSlider = document.getElementById('stroke-width');

  const copyUrlBtn = document.getElementById('copy-url');
  const connectionDot = document.getElementById('connection-status');

  // Echo suppression: track which element the user is actively interacting with
  let activeInput = null;
  let activeInputClearTimeout = null;

  function setActiveInput(el) {
    clearTimeout(activeInputClearTimeout);
    activeInput = el;
  }

  function clearActiveInput() {
    // Delay clearing so the change event can fire first
    activeInputClearTimeout = setTimeout(() => { activeInput = null; }, 100);
  }

  // Attach echo suppression via event delegation (captures cover all inputs/selects)
  document.addEventListener('focus', (e) => {
    if (e.target.matches('input, select')) setActiveInput(e.target);
  }, true);
  document.addEventListener('pointerdown', (e) => {
    if (e.target.matches('input, select')) setActiveInput(e.target);
  }, true);
  document.addEventListener('blur', (e) => {
    if (e.target.matches('input, select')) clearActiveInput();
  }, true);
  document.addEventListener('pointerup', (e) => {
    if (e.target.matches('input, select')) clearActiveInput();
  }, true);

  // Cache slider display span elements to avoid fragile querySelector chains
  const shadowBlurDisplay = shadowBlurSlider.closest('.range-with-value')?.querySelector('span');
  const shadowOffsetXDisplay = shadowOffsetXSlider.closest('.range-with-value')?.querySelector('span');
  const shadowOffsetYDisplay = shadowOffsetYSlider.closest('.range-with-value')?.querySelector('span');
  const strokeWidthDisplay = strokeWidthSlider.closest('.range-with-value')?.querySelector('span');

  // Set timer name and OBS URL
  channelName.textContent = timer;
  const baseUrl = window.location.origin;
  obsUrlInput.value = `${baseUrl}/overlay?timer=${timer}`;

  // Update button states to reflect timer status
  function updateStatus(isRunning) {
    if (isRunning) {
      btnStart.classList.add('disabled');
      btnStart.classList.remove('active');
      btnStop.classList.remove('disabled');
      btnStop.classList.add('active');
    } else {
      btnStart.classList.remove('disabled');
      btnStart.classList.add('active');
      btnStop.classList.add('disabled');
      btnStop.classList.remove('active');
    }
  }

  // Update UI from state, skipping the element the user is actively interacting with
  function updateUIFromState(state) {
    function setIfNotActive(el, value) {
      if (el !== activeInput) el.value = value;
    }

    function setCheckedIfNotActive(el, checked) {
      if (el !== activeInput) el.checked = checked;
    }

    // Timer settings
    if (state.mode) setIfNotActive(modeSelect, state.mode);
    if (state.end_behavior) setIfNotActive(endBehaviorSelect, state.end_behavior);
    if (state.format) setIfNotActive(formatSelect, state.format);

    // Convert duration_ms to readable format
    const totalSeconds = Math.floor(state.duration_ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let durationStr;
    if (hours > 0) {
      durationStr = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
      durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      durationStr = `0:${seconds.toString().padStart(2, '0')}`;
    }
    setIfNotActive(durationInput, durationStr);

    // Styling
    if (state.font_family) setIfNotActive(fontFamilySelect, state.font_family);
    if (state.font_weight) setIfNotActive(fontWeightSelect, state.font_weight);
    if (state.font_size !== undefined) {
      setIfNotActive(fontSizeSlider, state.font_size);
      if (fontSizeSlider !== activeInput) fontSizeDisplay.textContent = state.font_size + 'px';
    }
    if (state.text_color) {
      setIfNotActive(textColorInput, state.text_color);
      if (textColorPicker !== activeInput) {
        textColorPicker.value = state.text_color.startsWith('#') ? state.text_color : '#FFFFFF';
      }
    }

    setCheckedIfNotActive(shadowEnabled, !!state.shadow_enabled);
    shadowControls.style.opacity = state.shadow_enabled ? '1' : '0.5';
    if (state.shadow_color) {
      setIfNotActive(shadowColorInput, state.shadow_color);
      if (shadowColorPicker !== activeInput) shadowColorPicker.value = state.shadow_color;
    }
    if (state.shadow_blur !== undefined) setIfNotActive(shadowBlurSlider, state.shadow_blur);
    if (state.shadow_offset_x !== undefined) setIfNotActive(shadowOffsetXSlider, state.shadow_offset_x);
    if (state.shadow_offset_y !== undefined) setIfNotActive(shadowOffsetYSlider, state.shadow_offset_y);

    setCheckedIfNotActive(strokeEnabled, !!state.stroke_enabled);
    strokeControls.style.opacity = state.stroke_enabled ? '1' : '0.5';
    if (state.stroke_color) {
      setIfNotActive(strokeColorInput, state.stroke_color);
      if (strokeColorPicker !== activeInput) strokeColorPicker.value = state.stroke_color;
    }
    if (state.stroke_width !== undefined) setIfNotActive(strokeWidthSlider, state.stroke_width);

    updateSliderDisplays();
    updateStatus(state.is_running);
  }

  // Update slider display values
  function updateSliderDisplays() {
    fontSizeDisplay.textContent = fontSizeSlider.value + 'px';
    if (shadowBlurDisplay) shadowBlurDisplay.textContent = shadowBlurSlider.value + 'px';
    if (shadowOffsetXDisplay) shadowOffsetXDisplay.textContent = shadowOffsetXSlider.value + 'px';
    if (shadowOffsetYDisplay) shadowOffsetYDisplay.textContent = shadowOffsetYSlider.value + 'px';
    if (strokeWidthDisplay) strokeWidthDisplay.textContent = strokeWidthSlider.value + 'px';
  }

  // Connection status helpers
  function setConnected(connected) {
    connectionDot.classList.toggle('connected', connected);
    connectionDot.classList.toggle('disconnected', !connected);
  }

  // Shared handler for all state updates (initial, sync, config)
  function handleStateUpdate(state) {
    updateUIFromState(state);
    applyTimerStyles(timerPreview, state);
  }

  // Create connection
  const connection = createTimerConnection(timer, {
    onConnect: () => {
      console.log('Connected to server');
      setConnected(true);
    },

    onState: handleStateUpdate,
    onSync: handleStateUpdate,
    onConfigUpdate: handleStateUpdate,

    onDisconnect: () => {
      console.log('Disconnected');
      setConnected(false);
    }
  });

  // Start render loop for preview
  connection.startRenderLoop((currentTime, state) => {
    if (!state) return;

    let displayTime = currentTime;
    if (state.mode === 'countdown' && state.end_behavior === 'stop' && currentTime < 0) {
      displayTime = 0;
    }

    timerPreview.textContent = formatTime(displayTime, state.format);
  });

  // Button handlers
  btnStart.addEventListener('click', () => connection.start());
  btnStop.addEventListener('click', () => connection.stop());
  btnReset.addEventListener('click', () => {
    const duration = parseDuration(durationInput.value);
    connection.reset(duration);
  });

  // Adjust buttons
  document.querySelectorAll('[data-adjust]').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.dataset.adjust);
      connection.adjust(delta);
    });
  });

  // Duration update function
  function updateDuration() {
    const duration = parseDuration(durationInput.value);
    connection.set({ duration });
  }

  // Duration input - set on enter or button click
  durationInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      updateDuration();
    }
  });

  btnUpdateDuration.addEventListener('click', updateDuration);

  // Mode change
  modeSelect.addEventListener('change', () => {
    connection.set({ mode: modeSelect.value });
  });

  // Config changes
  function updateConfig(config) {
    connection.updateConfig(config);
  }

  endBehaviorSelect.addEventListener('change', () => {
    updateConfig({ end_behavior: endBehaviorSelect.value });
  });

  formatSelect.addEventListener('change', () => {
    updateConfig({ format: formatSelect.value });
  });

  // Styling changes
  fontFamilySelect.addEventListener('change', () => {
    updateConfig({ font_family: fontFamilySelect.value });
  });

  fontWeightSelect.addEventListener('change', () => {
    updateConfig({ font_weight: parseInt(fontWeightSelect.value) });
  });

  fontSizeSlider.addEventListener('input', () => {
    fontSizeDisplay.textContent = fontSizeSlider.value + 'px';
    timerPreview.style.fontSize = fontSizeSlider.value + 'px';
  });

  fontSizeSlider.addEventListener('change', () => {
    updateConfig({ font_size: parseInt(fontSizeSlider.value) });
  });

  // Text color
  textColorPicker.addEventListener('input', () => {
    textColorInput.value = textColorPicker.value;
    timerPreview.style.color = textColorPicker.value;
  });

  textColorPicker.addEventListener('change', () => {
    updateConfig({ text_color: textColorPicker.value });
  });

  textColorInput.addEventListener('change', () => {
    updateConfig({ text_color: textColorInput.value });
  });

  // Shadow controls
  shadowEnabled.addEventListener('change', () => {
    shadowControls.style.opacity = shadowEnabled.checked ? '1' : '0.5';
    updateConfig({ shadow_enabled: shadowEnabled.checked ? 1 : 0 });
  });

  shadowColorPicker.addEventListener('input', () => {
    shadowColorInput.value = shadowColorPicker.value;
  });

  shadowColorPicker.addEventListener('change', () => {
    updateConfig({ shadow_color: shadowColorPicker.value });
  });

  shadowColorInput.addEventListener('change', () => {
    updateConfig({ shadow_color: shadowColorInput.value });
  });

  shadowBlurSlider.addEventListener('input', () => {
    if (shadowBlurDisplay) shadowBlurDisplay.textContent = shadowBlurSlider.value + 'px';
  });

  shadowBlurSlider.addEventListener('change', () => {
    updateConfig({ shadow_blur: parseInt(shadowBlurSlider.value) });
  });

  shadowOffsetXSlider.addEventListener('input', () => {
    if (shadowOffsetXDisplay) shadowOffsetXDisplay.textContent = shadowOffsetXSlider.value + 'px';
  });

  shadowOffsetXSlider.addEventListener('change', () => {
    updateConfig({ shadow_offset_x: parseInt(shadowOffsetXSlider.value) });
  });

  shadowOffsetYSlider.addEventListener('input', () => {
    if (shadowOffsetYDisplay) shadowOffsetYDisplay.textContent = shadowOffsetYSlider.value + 'px';
  });

  shadowOffsetYSlider.addEventListener('change', () => {
    updateConfig({ shadow_offset_y: parseInt(shadowOffsetYSlider.value) });
  });

  // Stroke controls
  strokeEnabled.addEventListener('change', () => {
    strokeControls.style.opacity = strokeEnabled.checked ? '1' : '0.5';
    updateConfig({ stroke_enabled: strokeEnabled.checked ? 1 : 0 });
  });

  strokeColorPicker.addEventListener('input', () => {
    strokeColorInput.value = strokeColorPicker.value;
  });

  strokeColorPicker.addEventListener('change', () => {
    updateConfig({ stroke_color: strokeColorPicker.value });
  });

  strokeColorInput.addEventListener('change', () => {
    updateConfig({ stroke_color: strokeColorInput.value });
  });

  strokeWidthSlider.addEventListener('input', () => {
    if (strokeWidthDisplay) strokeWidthDisplay.textContent = strokeWidthSlider.value + 'px';
  });

  strokeWidthSlider.addEventListener('change', () => {
    updateConfig({ stroke_width: parseInt(strokeWidthSlider.value) });
  });

  // Copy URL button
  copyUrlBtn.addEventListener('click', () => {
    obsUrlInput.select();
    navigator.clipboard.writeText(obsUrlInput.value).then(() => {
      copyUrlBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyUrlBtn.textContent = 'Copy';
      }, 2000);
    });
  });
})();
