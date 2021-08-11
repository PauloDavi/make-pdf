import { format } from 'date-fns';
import { Request, Response, Router } from 'express';
import PDFPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

import { prismaClient } from './database/prismaClient';

const routes = Router();

routes.get('/products', async (request: Request, response: Response) => {
	const products = await prismaClient.products.findMany();

	return response.json(products);
});

routes.get('/products/report', async (request: Request, response: Response) => {
	const products = await prismaClient.products.findMany();

	const productsValues = products.map(({ id, description, price, quantity }) => [
		{ text: id },
		{ text: description },
		{ text: `R$ ${price.toFixed(2).replace('.', ',')}`, alignment: 'right' },
		{ text: quantity, alignment: 'right' },
	]);

	const totalOfProducts = products.reduce((total, { quantity }) => total + quantity, 0);

	const fonts = {
		Helvetica: {
			normal: 'Helvetica',
			bold: 'Helvetica-Bold',
			italics: 'Helvetica-Oblique',
			bolditalics: 'Helvetica-BoldOblique',
		},
	};

	const printer = new PDFPrinter(fonts);

	const docDefinitions: TDocumentDefinitions = {
		defaultStyle: { font: 'Helvetica' },
		content: [
			{
				columns: [
					{ text: 'Relatório de Produtos', style: 'header' },
					{
						text: `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
						alignment: 'right',
						fontSize: 14,
					},
				],
			},
			{
				text: '--------------------------------------------------------------------------------------------------------------------------------',
				margin: [0, 16, 0, 16],
			},
			{
				table: {
					widths: ['auto', '*', 'auto', 'auto'],
					body: [
						[
							{ text: 'Id', style: 'columnsTitle', alignment: 'center' },
							{ text: 'Descrição', style: 'columnsTitle', alignment: 'center' },
							{ text: 'Preço', style: 'columnsTitle', alignment: 'center' },
							{ text: 'Quantidade', style: 'columnsTitle', alignment: 'center' },
						],
						...productsValues,
						[
							{ text: 'Total de Produtos', style: 'tableFooter', colSpan: 3 },
							{},
							{},
							{ text: String(totalOfProducts), alignment: 'right', style: 'tableFooter' },
						],
					],
				},
			},
		],
		styles: {
			header: {
				fontSize: 18,
				bold: true,
			},
			columnsTitle: {
				fontSize: 16,
				bold: true,
			},
			tableFooter: {
				fontSize: 12,
				bold: true,
			},
		},
	};

	const pdfDoc = printer.createPdfKitDocument(docDefinitions);

	const chunks: Buffer[] = [];

	pdfDoc.on('data', (chunk: Buffer) => {
		chunks.push(chunk);
	});

	pdfDoc.end();

	pdfDoc.on('end', () => {
		const result = Buffer.concat(chunks);

		response.end(result);
	});
});

export { routes };
