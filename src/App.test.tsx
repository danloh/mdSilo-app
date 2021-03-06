import React from 'react';
import { render, screen } from '@testing-library/react';
import * as fileUtil from 'file/util';
import { shortenString } from 'utils/helper';
import App from './components/App';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
})

test('renders App component', () => {
  render(<App />);
  expect(screen.getByText('mdSilo')).toBeInTheDocument();
})

test('file util', () => {
  expect(fileUtil.normalizeSlash('C:/')).toBe('C:');
  expect(fileUtil.normalizeSlash('C:\\Files\\mdsilo\\app.msi')).toBe('C:/Files/mdsilo/app.msi');
  expect(fileUtil.joinPath(...['/', 'md', '/silo/'])).toBe('/md/silo');
  expect(fileUtil.trimSlashAll('/\\md/silo\\')).toBe('md/silo');
})

test('string util', () => {
  const txt = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry.';
  expect(shortenString(txt, 'dummy', 42))
    .toBe('m Ipsum is simply ==dummy== text of the print');
  expect(shortenString(txt, 'Ipsum', 42))
    .toBe('Lorem ==Ipsum== is simply dummy text of the p');
  expect(shortenString(txt, 'been', 42))
    .toBe('dustry. Lorem Ipsum has ==been== the industry.');
  expect(shortenString('Ipsum is simply dummy text of the print', 'dummy', 42))
    .toBe('Ipsum is simply ==dummy== text of the print');
})
