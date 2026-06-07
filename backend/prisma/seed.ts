import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.event.deleteMany();
  await prisma.sponsorImpression.deleteMany();
  await prisma.sponsorCampaign.deleteMany();
  await prisma.sponsor.deleteMany();
  await prisma.governanceVote.deleteMany();
  await prisma.reputationHistory.deleteMany();
  await prisma.translation.deleteMany();
  await prisma.report.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.marker.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rateLimit.deleteMany();

  // Create test users
  console.log('👤 Creating test users...');
  const user1 = await prisma.user.create({
    data: {
      username: 'test_user_1',
      email: 'user1@example.com',
      role: 'user',
      reputationScore: 100,
      contributionCount: 5,
      accuracyRate: 0.85,
      status: 1,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      username: 'test_user_2',
      email: 'user2@example.com',
      role: 'user',
      reputationScore: 50,
      contributionCount: 2,
      accuracyRate: 0.75,
      status: 1,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      reputationScore: 500,
      contributionCount: 50,
      accuracyRate: 0.95,
      status: 1,
    },
  });

  console.log(`✅ Created ${3} users`);

  // Create test markers
  console.log('📍 Creating test markers...');
  const marker1 = await prisma.marker.create({
    data: {
      category: 'abuse',
      title: '虐待动物举报',
      publicLatitude: 39.9042,
      publicLongitude: 116.4074,
      privateLatitude: 39.9042,
      privateLongitude: 116.4074,
      address: '北京市朝阳区建国门外大街',
      description: '发现有人虐待流浪猫，需要关注',
      sourceLocale: 'zh-CN',
      fingerprint: 'test-fingerprint-1',
      visibility: 'public',
      reviewStatus: 'approved',
      consensusStatus: 'verified',
      confidenceScore: 0.85,
      supportScore: 0.9,
      disputeScore: 0.1,
      freshnessScore: 1.0,
      status: 1,
    },
  });

  const marker2 = await prisma.marker.create({
    data: {
      category: 'station',
      title: '阿明的小动物救助站',
      publicLatitude: 39.9,
      publicLongitude: 116.4,
      privateLatitude: 39.9089,
      privateLongitude: 116.4012,
      address: '北京市朝阳区某小区附近',
      description: '可接收流浪猫临时中转，提供基础医疗',
      contactInfo: '微信: aming_rescue',
      sourceLocale: 'zh-CN',
      fingerprint: 'test-fingerprint-2',
      visibility: 'masked',
      reviewStatus: 'approved',
      consensusStatus: 'verified',
      confidenceScore: 0.92,
      supportScore: 0.95,
      disputeScore: 0.05,
      freshnessScore: 1.0,
      status: 1,
    },
  });

  const marker3 = await prisma.marker.create({
    data: {
      category: 'poison',
      title: 'Suspected poisoning incident',
      publicLatitude: 39.95,
      publicLongitude: 116.35,
      privateLatitude: 39.95,
      privateLongitude: 116.35,
      address: 'Near Chaoyang Park, Beijing',
      description: 'Found suspicious food, multiple stray animals affected',
      sourceLocale: 'en',
      fingerprint: 'test-fingerprint-3',
      visibility: 'public',
      reviewStatus: 'pending',
      consensusStatus: 'pending',
      confidenceScore: 0.5,
      supportScore: 0.6,
      disputeScore: 0.4,
      freshnessScore: 1.0,
      status: 1,
    },
  });

  const marker4 = await prisma.marker.create({
    data: {
      category: 'nearby_adoption',
      title: '亲人橘猫找免费领养',
      publicLatitude: 39.9188,
      publicLongitude: 116.418,
      privateLatitude: 39.9172,
      privateLongitude: 116.4198,
      address: '北京市东城区某社区附近',
      description: '成年橘猫，性格亲人，已做基础驱虫。希望同城免费领养，接受回访，不涉及购买、定金或押金。',
      contactInfo: '站内联系 test_user_1',
      sourceLocale: 'zh-CN',
      fingerprint: 'test-fingerprint-4',
      visibility: 'masked',
      reviewStatus: 'approved',
      consensusStatus: 'pending',
      confidenceScore: 0.72,
      supportScore: 0.7,
      disputeScore: 0,
      freshnessScore: 1.0,
      status: 1,
    },
  });

  console.log(`✅ Created ${4} markers`);

  // Create feedback
  console.log('💬 Creating feedback...');
  await prisma.feedback.create({
    data: {
      markerId: marker1.id,
      userId: user1.id,
      feedbackType: 'confirm',
      comment: '我也看到了，情况属实',
      confidenceLevel: 4,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
    },
  });

  await prisma.feedback.create({
    data: {
      markerId: marker1.id,
      userId: user2.id,
      feedbackType: 'support',
      comment: '希望能尽快处理',
      confidenceLevel: 3,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
    },
  });

  console.log(`✅ Created ${2} feedback entries`);

  // Create translations
  console.log('🌐 Creating translations...');
  await prisma.translation.create({
    data: {
      markerId: marker1.id,
      locale: 'en',
      title: 'Animal Abuse Report',
      description: 'Found someone abusing stray cats, needs attention',
      address: 'Jianguomenwai Street, Chaoyang District, Beijing',
    },
  });

  await prisma.translation.create({
    data: {
      markerId: marker2.id,
      locale: 'en',
      title: "Aming's Animal Rescue Station",
      description: 'Can temporarily shelter stray cats, provides basic medical care',
      address: 'Near a residential area in Chaoyang District, Beijing',
    },
  });

  await prisma.translation.create({
    data: {
      markerId: marker4.id,
      locale: 'en',
      title: 'Friendly orange cat for free adoption',
      description: 'Adult orange cat, friendly temperament, basic deworming completed. Same-city free adoption only, follow-up accepted, no purchase fee or deposit.',
      address: 'Near a residential community in Dongcheng District, Beijing',
    },
  });

  console.log(`✅ Created ${3} translations`);

  // Create sponsor
  console.log('💼 Creating sponsor...');
  const sponsor = await prisma.sponsor.create({
    data: {
      name: '爱宠动物医院',
      logoUrl: 'https://example.com/logo.png',
      websiteUrl: 'https://example.com',
      contactEmail: 'contact@example.com',
      tier: 'premium',
      status: 1,
      totalBudget: 10000,
      spentBudget: 1000,
    },
  });

  // Create sponsor campaign
  const campaign = await prisma.sponsorCampaign.create({
    data: {
      sponsorId: sponsor.id,
      name: '春季宠物体检优惠',
      description: '全面体检套餐8折优惠',
      targetCategory: 'station',
      budget: 5000,
      spent: 500,
      impressionGoal: 10000,
      impressionCount: 1000,
      clickCount: 50,
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-06-30'),
      status: 'active',
    },
  });

  console.log(`✅ Created ${1} sponsor and ${1} campaign`);

  // Create reputation history
  console.log('⭐ Creating reputation history...');
  await prisma.reputationHistory.create({
    data: {
      userId: user1.id,
      actionType: 'marker_submit',
      points: 10,
      reason: 'Submitted a verified marker',
    },
  });

  await prisma.reputationHistory.create({
    data: {
      userId: user1.id,
      actionType: 'feedback_submit',
      points: 5,
      reason: 'Provided helpful feedback',
    },
  });

  console.log(`✅ Created ${2} reputation history entries`);

  console.log('✨ Database seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   Users: ${3}`);
  console.log(`   Markers: ${4}`);
  console.log(`   Feedback: ${2}`);
  console.log(`   Translations: ${3}`);
  console.log(`   Sponsors: ${1}`);
  console.log(`   Campaigns: ${1}`);
  console.log(`   Reputation History: ${2}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
