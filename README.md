# AgroGreen Warehousing - WMS

A modern Warehouse Management System built with Next.js, TypeScript, and Firebase.

## Features

- 🔐 Firebase Authentication
- 📊 Interactive Dashboard with Statistics
- 📈 Data Visualization with Recharts
- 📱 Responsive Design
- 🎨 Modern UI with Chakra UI
- 🔒 Role-based Access Control

## Prerequisites

- Node.js 18+ and npm
- Firebase account and project

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd wms
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with your Firebase configuration:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard page
│   ├── surveys/          # UH Surveys page
│   ├── inward/           # Inward page
│   ├── outward/          # Outward page
│   ├── reports/          # Reports page
│   ├── ro/              # Release Order page
│   ├── master-data/     # Master Data page
│   └── login/           # Login page
├── components/           # Reusable components
│   └── layout/          # Layout components
├── contexts/            # React contexts
├── lib/                 # Utility functions and configurations
└── types/              # TypeScript type definitions
```

## Technologies Used

- Next.js 14
- TypeScript
- Firebase (Authentication, Firestore)
- Chakra UI
- Recharts
- React Icons

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
