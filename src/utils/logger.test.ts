import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from './logger.ts';

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    logger.setLevel('debug'); // reset to lowest level
  });

  describe('setLevel', () => {
    it('should suppress debug messages when level is info', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logger.setLevel('info');
      logger.debug('test');
      expect(spy).not.toHaveBeenCalled();
    });

    it('should suppress all messages when level is silent', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.setLevel('silent');
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should call console.log when level is debug', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logger.setLevel('debug');
      logger.debug('hello');
      expect(spy).toHaveBeenCalledWith('', 'hello');
    });

    it('should pass multiple arguments', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logger.setLevel('debug');
      logger.debug('a', 'b', 3);
      expect(spy).toHaveBeenCalledWith('', 'a', 'b', 3);
    });
  });

  describe('info', () => {
    it('should call console.log with [eventiq] prefix', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logger.info('message');
      expect(spy).toHaveBeenCalledWith('[eventiq]', 'message');
    });

    it('should be suppressed at warn level', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logger.setLevel('warn');
      logger.info('message');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should call console.warn with [eventiq] prefix', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.warn('warning');
      expect(spy).toHaveBeenCalledWith('[eventiq]', 'warning');
    });

    it('should be suppressed at error level', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.setLevel('error');
      logger.warn('warning');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should call console.error with [eventiq] prefix', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('failure');
      expect(spy).toHaveBeenCalledWith('[eventiq]', 'failure');
    });

    it('should show at error level', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.setLevel('error');
      logger.error('failure');
      expect(spy).toHaveBeenCalledWith('[eventiq]', 'failure');
    });

    it('should be suppressed at silent level', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.setLevel('silent');
      logger.error('failure');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('level hierarchy', () => {
    it('debug level should show all messages', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.setLevel('debug');
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(logSpy).toHaveBeenCalledTimes(2); // debug + info
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('warn level should only show warn and error', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.setLevel('warn');
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
