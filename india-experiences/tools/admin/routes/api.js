import express from 'express';
import * as fileManager from '../services/file-manager.js';

const router = express.Router();

// Dashboard status
router.get('/status', async (req, res, next) => {
  try {
    const cities = await fileManager.getCities();
    const categories = await fileManager.getCategories();
    const adminState = await fileManager.getAdminState();

    // Build status for each city
    const cityStatus = await Promise.all(cities.map(async (city) => {
      const contentBank = await fileManager.getContentBank(city.slug);
      const contentFiles = await fileManager.getContentFiles(city.slug);
      const cityState = adminState.cities?.[city.slug] || {};

      return {
        ...city,
        status: cityState.status || 'not-started',
        contentBankPages: contentBank?.pages?.length || 0,
        generatedPages: contentFiles.length,
        validatedPages: cityState.validatedCount || 0,
        lastUpdated: cityState.lastUpdated || null
      };
    }));

    res.json({
      cities: cityStatus,
      categories,
      summary: {
        totalCities: cities.length,
        citiesStarted: cityStatus.filter(c => c.status !== 'not-started').length,
        totalPages: cityStatus.reduce((sum, c) => sum + c.contentBankPages, 0),
        totalGenerated: cityStatus.reduce((sum, c) => sum + c.generatedPages, 0)
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get content bank for city
router.get('/content-bank/:city', async (req, res, next) => {
  try {
    const contentBank = await fileManager.getContentBank(req.params.city);
    if (!contentBank) {
      return res.status(404).json({ error: 'Content bank not found' });
    }
    res.json(contentBank);
  } catch (err) {
    next(err);
  }
});

// Update content bank for city
router.put('/content-bank/:city', async (req, res, next) => {
  try {
    await fileManager.saveContentBank(req.params.city, req.body);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Update single page in content bank
router.put('/content-bank/:city/page/:pageId', async (req, res, next) => {
  try {
    const contentBank = await fileManager.getContentBank(req.params.city);
    if (!contentBank) {
      return res.status(404).json({ error: 'Content bank not found' });
    }

    const pageIndex = contentBank.pages.findIndex(p => p.id === req.params.pageId);
    if (pageIndex === -1) {
      return res.status(404).json({ error: 'Page not found' });
    }

    contentBank.pages[pageIndex] = { ...contentBank.pages[pageIndex], ...req.body };
    contentBank.updatedAt = new Date().toISOString();

    await fileManager.saveContentBank(req.params.city, contentBank);
    res.json({ success: true, page: contentBank.pages[pageIndex] });
  } catch (err) {
    next(err);
  }
});

// Add page to content bank
router.post('/content-bank/:city/page', async (req, res, next) => {
  try {
    let contentBank = await fileManager.getContentBank(req.params.city);
    const cities = await fileManager.getCities();
    const city = cities.find(c => c.slug === req.params.city);

    if (!contentBank) {
      // Create new content bank
      contentBank = {
        city: req.params.city,
        cityName: city?.name || req.params.city,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        categories: [],
        pages: [],
        notes: ''
      };
    }

    const newPage = {
      id: `${req.params.city}-${Date.now()}`,
      type: req.body.type || 'paa',
      category: req.body.category || 'general',
      title: req.body.title || 'New Page',
      slug: req.body.slug || '',
      contentDirection: req.body.contentDirection || '',
      status: 'not-started',
      wordCount: null,
      generatedAt: null,
      validationErrors: []
    };

    contentBank.pages.push(newPage);
    contentBank.updatedAt = new Date().toISOString();

    await fileManager.saveContentBank(req.params.city, contentBank);
    res.json({ success: true, page: newPage });
  } catch (err) {
    next(err);
  }
});

// Delete page from content bank
router.delete('/content-bank/:city/page/:pageId', async (req, res, next) => {
  try {
    const contentBank = await fileManager.getContentBank(req.params.city);
    if (!contentBank) {
      return res.status(404).json({ error: 'Content bank not found' });
    }

    contentBank.pages = contentBank.pages.filter(p => p.id !== req.params.pageId);
    contentBank.updatedAt = new Date().toISOString();

    await fileManager.saveContentBank(req.params.city, contentBank);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Get content files for city
router.get('/files/:city', async (req, res, next) => {
  try {
    const files = await fileManager.getContentFiles(req.params.city);
    const fileDetails = await Promise.all(files.map(async (slug) => {
      const content = await fileManager.readContentFile(req.params.city, slug);
      return {
        slug,
        ...content.frontmatter,
        wordCount: content.content?.split(/\s+/).length || 0
      };
    }));
    res.json(fileDetails);
  } catch (err) {
    next(err);
  }
});

// Get single content file
router.get('/files/:city/:slug', async (req, res, next) => {
  try {
    const content = await fileManager.readContentFile(req.params.city, req.params.slug);
    if (!content) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(content);
  } catch (err) {
    next(err);
  }
});

// Delete content file
router.delete('/files/:city/:slug', async (req, res, next) => {
  try {
    await fileManager.deleteContentFile(req.params.city, req.params.slug);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Research endpoint (Phase 3)
router.post('/research', async (req, res, next) => {
  try {
    const { researcher } = await import('../services/researcher.js');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await researcher(req.body, (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    res.write('data: {"done": true}\n\n');
    res.end();
  } catch (err) {
    next(err);
  }
});

// Generate endpoint (Phase 4)
router.post('/generate', async (req, res, next) => {
  try {
    const { generator } = await import('../services/generator.js');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await generator(req.body, (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    res.write('data: {"done": true}\n\n');
    res.end();
  } catch (err) {
    next(err);
  }
});

// Validate endpoint (Phase 5)
router.post('/validate', async (req, res, next) => {
  try {
    const { validator } = await import('../services/validator.js');
    const results = await validator(req.body);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// Update admin state
router.put('/admin-state', async (req, res, next) => {
  try {
    const currentState = await fileManager.getAdminState();
    const newState = { ...currentState, ...req.body };
    await fileManager.saveAdminState(newState);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
