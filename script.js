const canvas = document.getElementById('chip-canvas');

if (canvas && window.THREE) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);

  const group = new THREE.Group();
  scene.add(group);

  const buildPointCloud = (count, mode) => {
    const positions = [];
    const colors = [];
    const colorA = new THREE.Color('#f5f7ff');
    const colorB = new THREE.Color('#f7c989');
    const colorC = new THREE.Color('#8fd7ff');

    for (let i = 0; i < count; i += 1) {
      let x = 0;
      let y = 0;
      let z = 0;

      if (mode === 'cube') {
        x = (Math.random() - 0.5) * 3.6;
        y = (Math.random() - 0.5) * 3.6;
        z = (Math.random() - 0.5) * 3.6;
      }

      if (mode === 'sphere') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 2.2;
        x = radius * Math.sin(phi) * Math.cos(theta);
        y = radius * Math.sin(phi) * Math.sin(theta);
        z = radius * Math.cos(phi);
      }

      if (mode === 'cone') {
        const theta = Math.random() * Math.PI * 2;
        const t = Math.random();
        const radius = 2.2 * (1 - t);
        x = Math.cos(theta) * radius;
        y = (t - 0.5) * 4.8;
        z = Math.sin(theta) * radius;
      }

      positions.push(x, y, z);

      const color = new THREE.Color().lerpColors(colorA, colorB, Math.random());
      const mix = new THREE.Color().lerpColors(color, colorC, Math.random() * 0.5);
      colors.push(mix.r, mix.g, mix.b);
    }

    return { positions, colors };
  };

  const pointClouds = [
    buildPointCloud(1800, 'cube'),
    buildPointCloud(1800, 'sphere'),
    buildPointCloud(1800, 'cone')
  ];

  const points = pointClouds.map((shape) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(shape.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(shape.colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const cloud = new THREE.Points(geometry, material);
    cloud.visible = false;
    group.add(cloud);
    return cloud;
  });

  const wireframes = [
    new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 3.4, 3.4),
      new THREE.MeshBasicMaterial({ color: '#dfeaff', transparent: true, opacity: 0.45, wireframe: true })
    ),
    new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 32, 32),
      new THREE.MeshBasicMaterial({ color: '#dfeaff', transparent: true, opacity: 0.45, wireframe: true })
    ),
    new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 4.6, 42),
      new THREE.MeshBasicMaterial({ color: '#dfeaff', transparent: true, opacity: 0.45, wireframe: true })
    )
  ];

  wireframes.forEach((mesh) => {
    mesh.visible = false;
    group.add(mesh);
  });

  let activeShape = 0;
  let previousShape = 0;
  let transitionProgress = 1;

  const setShapeState = (index) => {
    previousShape = activeShape;
    activeShape = index;
    transitionProgress = 0;

    points.forEach((mesh, meshIndex) => {
      mesh.visible = meshIndex === activeShape || meshIndex === previousShape;
    });

    wireframes.forEach((mesh, meshIndex) => {
      mesh.visible = meshIndex === activeShape || meshIndex === previousShape;
    });

    points[previousShape].material.opacity = 1;
    points[activeShape].material.opacity = 0;
    wireframes[previousShape].material.opacity = 0.45;
    wireframes[activeShape].material.opacity = 0;
  };

  const smoothEase = (value) => 1 - Math.pow(1 - value, 3);

  points[0].visible = true;
  wireframes[0].visible = true;
  points[0].material.opacity = 1;
  wireframes[0].material.opacity = 0.45;

  camera.position.set(0, 0.2, 8);

  const resizeRenderer = () => {
    const parent = canvas.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  resizeRenderer();
  window.addEventListener('resize', resizeRenderer);

  const tick = () => {
    requestAnimationFrame(tick);

    if (transitionProgress < 1) {
      transitionProgress = Math.min(1, transitionProgress + 0.025);
      const ease = smoothEase(transitionProgress);
      points[previousShape].material.opacity = 1 - ease;
      points[activeShape].material.opacity = ease;
      wireframes[previousShape].material.opacity = 0.45 * (1 - ease);
      wireframes[activeShape].material.opacity = 0.45 * ease;

      const scale = 1 + (1 - ease) * 0.12;
      points[previousShape].scale.setScalar(scale);
      points[activeShape].scale.setScalar(1 + ease * 0.12);
      wireframes[previousShape].scale.setScalar(scale);
      wireframes[activeShape].scale.setScalar(1 + ease * 0.12);

      if (transitionProgress >= 1) {
        points[previousShape].visible = false;
        wireframes[previousShape].visible = false;
        points[activeShape].visible = true;
        wireframes[activeShape].visible = true;
        points[previousShape].scale.setScalar(1);
        points[activeShape].scale.setScalar(1);
        wireframes[previousShape].scale.setScalar(1);
        wireframes[activeShape].scale.setScalar(1);
      }
    }

    group.rotation.x += 0.003;
    group.rotation.y += 0.006;
    group.rotation.z += 0.0015;
    renderer.render(scene, camera);
  };

  window.__sbasShapeState = setShapeState;
  tick();
}

const heroFeatureStates = [
  { index: '01', title: 'Practical AI & Automation', subtitle: 'Solutions that fit how your business works' },
  { index: '02', title: 'Built Around Your Business', subtitle: 'Thoughtful systems for your goals and team' },
  { index: '03', title: 'From Strategy to Support', subtitle: 'A steady partner from first idea to launch' }
];

const visualPanel = document.querySelector('.visual-panel');
const featureTag = document.querySelector('[data-feature-tag]');
const featureIndex = document.querySelector('[data-feature-index]');
const featureTitle = document.querySelector('[data-feature-title]');
const featureSubtitle = document.querySelector('[data-feature-subtitle]');
const featureButtons = document.querySelectorAll('[data-feature-button]');

if (visualPanel && featureTag && featureIndex && featureTitle && featureSubtitle) {
  let currentFeature = 0;

  const setFeatureState = (index) => {
    currentFeature = (index + heroFeatureStates.length) % heroFeatureStates.length;
    const state = heroFeatureStates[currentFeature];

    visualPanel.dataset.state = String(currentFeature + 1);
    featureTag.classList.remove('is-transitioning');
    void featureTag.offsetWidth;
    featureTag.classList.add('is-transitioning');

    if (window.__sbasShapeState) {
      window.__sbasShapeState(currentFeature);
    }

    window.setTimeout(() => {
      featureIndex.textContent = state.index;
      featureTitle.textContent = state.title;
      featureSubtitle.textContent = state.subtitle;
      featureTag.classList.remove('is-transitioning');
    }, 180);
  };

  featureButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const delta = button.dataset.featureButton === 'next' ? 1 : -1;
      setFeatureState(currentFeature + delta);
    });
  });

  setFeatureState(0);
}

const paymentForm = document.querySelector('[data-payment-form]');

if (paymentForm) {
  const submitButton = document.querySelector('[data-payment-submit]');
  const statusEl = paymentForm.querySelector('[data-form-status]');
  // Set data-lead-url on the form to the receptionist server's /lead address to
  // send submissions there. While it is empty, the form opens an email draft instead.
  const getLeadUrl = () => (paymentForm.dataset.leadUrl || '').trim();
  const recipients = ['Larry.Delone@sbasinfo.ai', 'Landon.Delone@sbasinfo.ai'];
  const defaultLabel = submitButton ? submitButton.textContent.trim() : 'Book Discovery Call';

  const value = (id) => document.getElementById(id)?.value?.trim() || '';

  const setStatus = (message, kind) => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.kind = kind || '';
  };

  const setSending = (sending) => {
    if (!submitButton) return;
    submitButton.disabled = sending;
    submitButton.textContent = sending ? 'Sending...' : defaultLabel;
  };

  // Fallback: let the visitor's own email app send it.
  const openEmailDraft = (data) => {
    const subject = encodeURIComponent('New Discovery Call Request');
    const body = encodeURIComponent(
      [
        'SBAS Discovery Call Inbound Request',
        '',
        `First Name: ${data.firstName}`,
        `Last Name: ${data.lastName}`,
        `Company: ${data.company}`,
        `Email: ${data.email}`,
        `Challenge: ${data.challenge}`,
        '',
        'This request was submitted from the SBAS.info contact form.'
      ].join('\n')
    );
    window.location.href = `mailto:${recipients.join(',')}?subject=${subject}&body=${body}`;
  };

  paymentForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = {
      firstName: value('first-name'),
      lastName: value('last-name'),
      company: value('company'),
      email: value('email'),
      challenge: value('notes'),
      website: value('website') // hidden spam trap, left empty by real visitors
    };

    const leadUrl = getLeadUrl();
    if (!leadUrl) {
      openEmailDraft(data);
      return;
    }

    setStatus('', '');
    setSending(true);

    try {
      const response = await fetch(leadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.ok) {
        paymentForm.reset();
        setStatus("Thanks! We've got your request and will be in touch to schedule your call.", 'success');
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Request sent';
        }
        return;
      }

      if (response.status === 400 && result.error) {
        setStatus(result.error, 'error');
        setSending(false);
        return;
      }

      throw new Error(`Unexpected response ${response.status}`);
    } catch (error) {
      // Server unreachable, too many requests, or an error: do not lose the lead.
      setStatus("We couldn't send that just now, so we're opening an email instead.", 'error');
      setSending(false);
      openEmailDraft(data);
    }
  });
}
