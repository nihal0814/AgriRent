import { Equipment, Conversation } from './types';

export const MOCK_EQUIPMENT: Equipment[] = [
  {
    id: '1',
    title: 'John Deere 5075E Utility',
    category: 'Tractors',
    brandModel: 'John Deere 5075E',
    dailyRate: 240,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDi33CSECk615nfwg9CALBrnUWBI6wPkJ4oK1XZ7urxjhNC5VgpBzD-KQcGBSfhiZ6gBEZKfZ1DIuDcKwqd4To8SSkc4aIMLweZ5LDANr956D6vbC_vzwP6P4CnOa7hEtLSWF6EGkKZ9A3_zF8ddBO7AbebS4qy2elYVr-NFq4hbjg7TNwaKzR4frS5Po35h0grR1vdBSrDCX8c3wvx1EDxNsO7pRq3rtuDhA2pzFyk8cn1sK-A-35b1zWGq43UtI_ZVZ1HSHbeGoU',
    status: 'in-use',
    nextAvailable: 'Oct 14th',
    location: 'Lancaster County, PA',
    distance: '1.2 km',
    rating: 4.9,
    reviewsCount: 42,
    owner: {
      name: 'Silver Creek Estates',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgdkGHvzDE-KwRpzDJsRMxqRURmQQfEa3bKu79Z4h1qMerR8s-pDo7GFNmi9Bhxe8Tvw502cFW1TdjNsKXD2WRE3Ncl97jVrtDJ6kfFipUfk-3Tm19iBmdcrE9exaU0NaBXfMIyg2n2HEluGSOVmfqMxMNd4aPhY7X6slsAql6IA906tZH4R7ITDLLdDxmlD__vnrPt8wVLAjRaHIVYBOwV6fY0qS1feZoc871rWDmQfi1HFAogvP38_EZafieBdu4FIaN5OLQCuM',
      isVerified: true
    },
    specs: {
      horsepower: '114.1 HP',
      fuelType: 'Diesel',
      transmission: '24 Speed',
      weight: '8,600 lbs'
    }
  },
  {
    id: '2',
    title: 'Land Pride RTA1258 Tiller',
    category: 'Tillers',
    brandModel: 'Land Pride RTA1258',
    dailyRate: 115,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAi2lD85A9TaSZatCZsWh60TOmJkkcxZnpkHHrXLalFyG4bBdJyCzxgSkmkAJeaAdT_aO3E7CXdcFGA6idMLfhs-HwfLH6sLV0NSn405Gb_kNYLnkseBs7uTFCP4-m8Cfn8Uw-Hf4BDJKNqo07fFgXA-X1Jt2Zv8GhPGyHLGo6Qi97w38a6CIvTgZhgw3wOVfIYLUnCobbYSTvalw46QRml7AidhBdZqe_scvKkY_pSncewbSmYNXHXfCM5wfg0ewlRG6ZQvyc7WhU',
    status: 'available',
    location: 'Sonoma County, CA',
    distance: '8.2 km',
    rating: 5.0,
    reviewsCount: 18,
    owner: {
      name: 'Green Valley Farm',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrwLizUHNEmg3qqqb43TAQKvkdE9W7rwMT1SI18dYDenh2aVNbhCEMvN3AOrJa_a7u2gTeww_aV5fihEprKAKVhJ2viG7HjNdYOp43hALRhlNQ3FfDZd4LQSqKH79wPZoAO1oHFgU3mRD3rrvzOiwdYrEKp_XBUFsJuTi4ltsTcot_mN2VRX_t3hzTqqD1H3ulvCzaDmPpMoMYvEW-pEGzd9Jyh-cpdiKTVeVX5dZJsNzHLwnlruqGUTvQ-iIhqC0TFlZviivcpao',
      isVerified: true
    },
    specs: {
      horsepower: 'N/A',
      fuelType: 'Manual',
      transmission: 'N/A',
      weight: '450 lbs'
    }
  }
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    participantName: 'John Miller',
    participantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUOxDiKccM5Os6_zbgD8zs0q-DOyU-4DevHm9fzeA-D1AzTIYbWNO_7cX8ak_VWwl5V-4SqJ-A4mRNNY1hbF84PzrXwuZuQETgYgocdi376b-DqLlMpJvPHHOz7PjIUNWS8fymperendO_vkjgeKiPM5zg9IrdsyizlO96Ki7GP-e90BXnPGXqlly6Xa0pf4KztntxJNlgUVk7wkqTy1H6bsZtKmi1AC9kqE8j70xHftU7B4PQvoPAt1LfwG8PDT5oeVFMZpcTdik',
    equipmentName: 'John Deere 5075E',
    equipmentImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9aoZmUYPG4sY22YStVpNrzuaLxtQNnFfn62JB6ezKqb5k2rJhLNHVFrfogJAUxkq0DbsL6DahO2dDLJUI_WK7RuD_jIbPZzxXQHIFvMRacTG-PHR4-SowQuHXu5aOhZyAimojdl8Mo7BkFdtjHvDRToXWncSKaj8bGDqQ0pNtFnM45bW2iemq36zpzottkzub3PNyXFBrqYtMS3EL3kpn9cJ57kgpufP0gxGOMpavYJpFqnzXanF2pwdDj03Dy_uUnzyBC11ESsY',
    lastMessage: 'Owner: Will be at the North Gate...',
    timestamp: 'Active',
    isActive: true,
    status: 'active'
  },
  {
    id: '2',
    participantName: 'Sarah Jenkins',
    participantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtAFfJgdZUPcs5iwE9kjC5F27_1nFvLJtRXBQ8oXmWokhEP7cWqSRTcnXGz2Ta9JYKmAeVQfEvD5ec9I8fQ66GZQqxemDd1Sid_DBAQbLczG8MZinrvNMx3KOBYxnXR1fD-aC1TgbIcJOugexjRH7TL6pNOpOA98O_zw4YzYEFLuGBIhIKr9Mmvw7oIcUrZF0X9bv_B63dDLlPJqpwLX2TR2lw4kbKI3R-QFUFweePRaSL_NUHiKCA2Pz6NcmpAV7ez25w6n3wy6c',
    equipmentName: 'Rotary Tiller 62in',
    equipmentImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtAFfJgdZUPcs5iwE9kjC5F27_1nFvLJtRXBQ8oXmWokhEP7cWqSRTcnXGz2Ta9JYKmAeVQfEvD5ec9I8fQ66GZQqxemDd1Sid_DBAQbLczG8MZinrvNMx3KOBYxnXR1fD-aC1TgbIcJOugexjRH7TL6pNOpOA98O_zw4YzYEFLuGBIhIKr9Mmvw7oIcUrZF0X9bv_B63dDLlPJqpwLX2TR2lw4kbKI3R-QFUFweePRaSL_NUHiKCA2Pz6NcmpAV7ez25w6n3wy6c',
    lastMessage: 'Renter: Great, see you then.',
    timestamp: '2h ago',
    isActive: false
  }
];
