import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:"goods-ab8b5",
      clientEmail:"firebase-adminsdk-fbsvc@goods-ab8b5.iam.gserviceaccount.com",
      privateKey:"-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDKfFUJKNSzyyqE\nDPR6vekk3s/EguOXLSmVxGJhG0noaaQCt3xBN0f8qGbMxT68ck72qISgPN8+HMnT\n35DO6RIs1mnhKaPIKKyZiQrvXw+0smTddNaaO09ANkcHcOf2nPwqUd2vEZIhzVmu\nF/PWzLGKpU8PKMZfaCnyWUOd2Z5EDhPwzAfDh6Mz/YVfnBWCGKeY3K1uzPo9E2oj\nbXoZxnJ5tOosXh8K7eDGG+4TfIkK9I6pck0qr67N/H/y0++U0x2ttqZY1KcyAPoR\nFzYvEtBWeLYiCCGKu27H9ujt7QI8xA1pqmluVpxvNac8mPRdBdq2TFmxBIWPGjKM\nFZFsdKjBAgMBAAECggEACCHGKIADStU19+etSeCmpFxua632BfRCX0lrygqWhUb4\n10MXMmdN9M+ukTq6skbE9RL/gI/xR0VQtbmczzJ9EF/sEKbjdP5tMB1Y2xQuRUuE\n0YAHvlnzbNjBMYNPTZAwcGKpTIagH8tndp5vpIjD+JV6/1jb3qkIRjtfg89hk8oK\nnRYhoMflD6uFHD7TiFEz9RX8Kocn/cV0Fe9jKnBH7s3yp1V43+WA0dMbHJHSqHP9\n0WwtFoSsWcDoyP+Xf0RX/j0CwLabk5c+yxihQKG+5kGztERCGrqBdLgFDyviNvxm\nbnON5sNrg8yRMl7aei5dZ+iL21UcFjTI1Hg5bYD1IQKBgQD0yflUQ9OlbFQMAbKb\n5s4rDwXHhkWh6ejbNWvBNhzueqhPvgmGBUrinXS2apsKIAMRnxmdDJ6+kxXP//gO\nm8BCJmjzuEK+cPc18KrnOucg+zTxCDP31g7JL8CEjgCZN9652Sx4Nz1/h2BP4FCi\no9dJsN8z2EKWz5qZ4T9kX1e+HwKBgQDTwl+qRGsO8Nh5Y8EI3PheW73gaV9qhTbT\n2jdOHCEdX73fK2Z5YA5Nl4q5ovQ+5BJWYtuOZXtC3QQCPkyoSBFfjpkUHO+k2Btu\nTmNTf/CYA0d4Q9nEpjhM9v/ARWA28MytjGiCf1WVlubAgmfAHXoVeAIuB1m4vE0c\n0zIyuBD9HwKBgFLf/pXU0Nb0sg/Ok1XM8ogJcf93KiQDOV7d2zlyxKDIzisRP9As\nAopunJEVzp/C7scMgnN1TllfGsds9eKcQJ8kueupuo8XV9rfPD1E5/N2mRnxmQaT\nZjYfAKLgILu++p0ZNcENkriWcLkaTLKDnePJCghXc1PzvXfTls64qNApAoGAKnNi\n3i1NEPezTdJzliVGHRRjIiO9nwsJjLrIL35wHQVeeOioaFibRW7FvqUuNZVfH7Y9\nsXQim6rW7OQ0Vd/sq61YfrG2UOOJzDkmrEyPnMm7gB6J/2QbEULKzm6Z9SmcvoXR\nRaflLlHL/Hen+Nlv6fHe7f9HO0N0afzkqUpBDZ0CgYAO9PJ3x8oPOUAkXv5cKMBl\nvABdsNNK4ZlsjxLhfo2MMeB33xEPR13Jk2UxIMLayf/b/2MrSo64mC8TJLax83rJ\nOL55LMuCc4V+Kfi7tzqdtWQDW+3rCmg2BqmjPrzonJs0QZ8NyGdxJyt0lTTq25Qa\ncRzLfUZj5yhNxDPizqNoMA==\n-----END PRIVATE KEY-----\n"
    }),
  });
}

export const auth = admin.auth();
export const db = admin.firestore();
