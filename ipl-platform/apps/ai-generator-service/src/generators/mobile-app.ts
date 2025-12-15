export interface MobileAppConfig {
  domain: string;
  projectName: string;
  platforms: ('ios' | 'android' | 'pwa')[];
  features: string[];
  modules: Array<{ name: string; description: string }>;
  screens: Array<{ name: string; type: string; description: string }>;
  tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }>;
  framework: 'react-native' | 'expo';
  authentication: boolean;
  offlineSync: boolean;
  pushNotifications: boolean;
}

export interface GeneratedMobileApp {
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  instructions: string;
  dependencies: Record<string, string>;
}

function toPascalCase(str: string): string {
  return str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, c => c.toUpperCase())
    .replace(/\s+/g, '');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function generateMobileApp(config: MobileAppConfig): GeneratedMobileApp {
  const projectName = config.projectName || `${toPascalCase(config.domain)}App`;
  const files: GeneratedMobileApp['files'] = [];

  files.push({
    path: 'package.json',
    description: 'Project dependencies and scripts',
    content: generatePackageJson(projectName, config),
  });

  files.push({
    path: 'app.json',
    description: 'Expo configuration',
    content: generateAppJson(projectName, config),
  });

  files.push({
    path: 'App.tsx',
    description: 'Main application entry point',
    content: generateAppTsx(config),
  });

  files.push({
    path: 'src/navigation/AppNavigator.tsx',
    description: 'Navigation configuration',
    content: generateNavigator(config),
  });

  files.push({
    path: 'src/screens/HomeScreen.tsx',
    description: 'Home screen component',
    content: generateHomeScreen(config),
  });

  for (const screen of config.screens || []) {
    files.push({
      path: `src/screens/${toPascalCase(screen.name)}Screen.tsx`,
      description: `${screen.name} screen - ${screen.type}`,
      content: generateScreen(screen, config),
    });
  }

  files.push({
    path: 'src/components/Card.tsx',
    description: 'Reusable card component',
    content: generateCardComponent(config),
  });

  files.push({
    path: 'src/components/Button.tsx',
    description: 'Reusable button component',
    content: generateButtonComponent(),
  });

  files.push({
    path: 'src/components/Input.tsx',
    description: 'Reusable input component',
    content: generateInputComponent(),
  });

  files.push({
    path: 'src/services/api.ts',
    description: 'API service layer',
    content: generateApiService(config),
  });

  if (config.offlineSync) {
    files.push({
      path: 'src/services/storage.ts',
      description: 'Offline storage service',
      content: generateStorageService(),
    });
  }

  if (config.authentication) {
    files.push({
      path: 'src/services/auth.ts',
      description: 'Authentication service',
      content: generateAuthService(),
    });

    files.push({
      path: 'src/screens/LoginScreen.tsx',
      description: 'Login screen',
      content: generateLoginScreen(),
    });
  }

  if (config.pushNotifications) {
    files.push({
      path: 'src/services/notifications.ts',
      description: 'Push notifications service',
      content: generateNotificationsService(),
    });
  }

  files.push({
    path: 'src/hooks/useApi.ts',
    description: 'API hook for data fetching',
    content: generateUseApiHook(),
  });

  files.push({
    path: 'src/context/AppContext.tsx',
    description: 'Global app context',
    content: generateAppContext(config),
  });

  files.push({
    path: 'src/types/index.ts',
    description: 'TypeScript type definitions',
    content: generateTypes(config),
  });

  files.push({
    path: 'src/theme/colors.ts',
    description: 'Theme colors',
    content: generateColors(),
  });

  files.push({
    path: 'src/theme/spacing.ts',
    description: 'Theme spacing',
    content: generateSpacing(),
  });

  files.push({
    path: 'tsconfig.json',
    description: 'TypeScript configuration',
    content: generateTsConfig(),
  });

  files.push({
    path: 'babel.config.js',
    description: 'Babel configuration',
    content: `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
`,
  });

  files.push({
    path: '.gitignore',
    description: 'Git ignore file',
    content: `node_modules/
.expo/
dist/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
`,
  });

  files.push({
    path: 'README.md',
    description: 'Project documentation',
    content: generateReadme(projectName, config),
  });

  const dependencies: Record<string, string> = {
    'expo': '~50.0.0',
    'expo-status-bar': '~1.11.0',
    'react': '18.2.0',
    'react-native': '0.73.0',
    '@react-navigation/native': '^6.1.0',
    '@react-navigation/native-stack': '^6.9.0',
    'react-native-screens': '~3.29.0',
    'react-native-safe-area-context': '4.8.0',
  };

  if (config.offlineSync) {
    dependencies['@react-native-async-storage/async-storage'] = '1.21.0';
  }

  if (config.pushNotifications) {
    dependencies['expo-notifications'] = '~0.27.0';
    dependencies['expo-device'] = '~5.9.0';
  }

  if (config.authentication) {
    dependencies['expo-secure-store'] = '~12.8.0';
  }

  const instructions = generateInstructions(projectName, config);

  return { files, instructions, dependencies };
}

function generatePackageJson(projectName: string, config: MobileAppConfig): string {
  const deps: Record<string, string> = {
    'expo': '~50.0.0',
    'expo-status-bar': '~1.11.0',
    'react': '18.2.0',
    'react-native': '0.73.0',
    '@react-navigation/native': '^6.1.0',
    '@react-navigation/native-stack': '^6.9.0',
    'react-native-screens': '~3.29.0',
    'react-native-safe-area-context': '4.8.0',
  };

  if (config.offlineSync) {
    deps['@react-native-async-storage/async-storage'] = '1.21.0';
  }
  if (config.pushNotifications) {
    deps['expo-notifications'] = '~0.27.0';
    deps['expo-device'] = '~5.9.0';
  }
  if (config.authentication) {
    deps['expo-secure-store'] = '~12.8.0';
  }

  return JSON.stringify({
    name: projectName.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    main: 'node_modules/expo/AppEntry.js',
    scripts: {
      start: 'expo start',
      android: 'expo start --android',
      ios: 'expo start --ios',
      web: 'expo start --web',
    },
    dependencies: deps,
    devDependencies: {
      '@babel/core': '^7.20.0',
      '@types/react': '~18.2.0',
      'typescript': '^5.1.0',
    },
    private: true,
  }, null, 2);
}

function generateAppJson(projectName: string, config: MobileAppConfig): string {
  return JSON.stringify({
    expo: {
      name: projectName,
      slug: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'automatic',
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#4a4af0',
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: `com.${projectName.toLowerCase().replace(/\s+/g, '')}`,
      },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#4a4af0',
        },
        package: `com.${projectName.toLowerCase().replace(/\s+/g, '')}`,
      },
      web: {
        favicon: './assets/favicon.png',
      },
    },
  }, null, 2);
}

function generateAppTsx(config: MobileAppConfig): string {
  return `import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
`;
}

function generateNavigator(config: MobileAppConfig): string {
  const screens = config.screens || [];
  const screenImports = screens.map(s => 
    `import ${toPascalCase(s.name)}Screen from '../screens/${toPascalCase(s.name)}Screen';`
  ).join('\n');
  
  const screenComponents = screens.map(s =>
    `      <Stack.Screen name="${toPascalCase(s.name)}" component={${toPascalCase(s.name)}Screen} />`
  ).join('\n');

  const authScreens = config.authentication ? `
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />` : '';
  
  const authImport = config.authentication ? `import LoginScreen from '../screens/LoginScreen';` : '';

  return `import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
${screenImports}
${authImport}

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: '#4a4af0' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >${authScreens}
      <Stack.Screen name="Home" component={HomeScreen} />
${screenComponents}
    </Stack.Navigator>
  );
}
`;
}

function generateHomeScreen(config: MobileAppConfig): string {
  const screens = config.screens || [];
  const navButtons = screens.map(s => 
    `        <Button title="${s.name}" onPress={() => navigation.navigate('${toPascalCase(s.name)}')} />`
  ).join('\n');

  return `import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function HomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Welcome to ${toPascalCase(config.domain)} App</Text>
        <Text style={styles.subtitle}>Select a feature to get started</Text>
        
        <Card title="Quick Actions">
          <View style={styles.buttonGroup}>
${navButtons}
          </View>
        </Card>
        
        <Card title="Statistics">
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  buttonGroup: {
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
`;
}

function generateScreen(screen: { name: string; type: string; description: string }, config: MobileAppConfig): string {
  const screenName = toPascalCase(screen.name);
  
  if (screen.type === 'list') {
    return generateListScreen(screenName, screen, config);
  } else if (screen.type === 'form') {
    return generateFormScreen(screenName, screen, config);
  } else if (screen.type === 'detail') {
    return generateDetailScreen(screenName, screen, config);
  } else if (screen.type === 'chart') {
    return generateChartScreen(screenName, screen, config);
  }
  
  return generateGenericScreen(screenName, screen, config);
}

function generateListScreen(name: string, screen: any, config: MobileAppConfig): string {
  return `import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/Card';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useApi } from '../hooks/useApi';

interface Item {
  id: string;
  title: string;
  subtitle: string;
  status: string;
}

export default function ${name}Screen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const { data, loading, error, refetch } = useApi<Item[]>('/${name.toLowerCase()}');

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity 
      style={styles.itemCard}
      onPress={() => navigation.navigate('${name}Detail', { id: item.id })}
    >
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return colors.success;
      case 'pending': return colors.warning;
      case 'inactive': return colors.error;
      default: return colors.primary;
    }
  };

  const sampleData: Item[] = [
    { id: '1', title: 'Item 1', subtitle: 'Description for item 1', status: 'Active' },
    { id: '2', title: 'Item 2', subtitle: 'Description for item 2', status: 'Pending' },
    { id: '3', title: 'Item 3', subtitle: 'Description for item 3', status: 'Active' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={data || sampleData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  itemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
`;
}

function generateFormScreen(name: string, screen: any, config: MobileAppConfig): string {
  return `import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function ${name}Screen({ navigation }: any) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Success', 'Form submitted successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card title="Enter Details">
          <Input
            label="Name *"
            placeholder="Enter name"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
          <Input
            label="Email *"
            placeholder="Enter email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Description"
            placeholder="Enter description"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
          />
        </Card>

        <View style={styles.buttonContainer}>
          <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
          <Button title="Submit" onPress={handleSubmit} loading={loading} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
`;
}

function generateDetailScreen(name: string, screen: any, config: MobileAppConfig): string {
  return `import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/Card';
import Button from '../components/Button';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function ${name}Screen({ route, navigation }: any) {
  const { id } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 500));
      setData({
        id: id || '1',
        title: 'Sample Item',
        description: 'This is a detailed description of the item.',
        status: 'Active',
        createdAt: new Date().toLocaleDateString(),
        updatedAt: new Date().toLocaleDateString(),
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card title="Details">
          <View style={styles.detailRow}>
            <Text style={styles.label}>Title</Text>
            <Text style={styles.value}>{data?.title}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{data?.description}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
              <Text style={styles.statusText}>{data?.status}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Created</Text>
            <Text style={styles.value}>{data?.createdAt}</Text>
          </View>
        </Card>

        <View style={styles.actions}>
          <Button title="Edit" onPress={() => navigation.navigate('${name}Edit', { id })} />
          <Button title="Delete" variant="danger" onPress={() => {}} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  detailRow: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: colors.text,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
`;
}

function generateChartScreen(name: string, screen: any, config: MobileAppConfig): string {
  return `import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/Card';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const { width } = Dimensions.get('window');

export default function ${name}Screen() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const chartData = [
    { label: 'Mon', value: 45 },
    { label: 'Tue', value: 72 },
    { label: 'Wed', value: 58 },
    { label: 'Thu', value: 89 },
    { label: 'Fri', value: 63 },
    { label: 'Sat', value: 41 },
    { label: 'Sun', value: 55 },
  ];

  const maxValue = Math.max(...chartData.map(d => d.value));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card title="Analytics Overview">
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>423</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.success }]}>+12%</Text>
              <Text style={styles.statLabel}>Growth</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>89</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>
        </Card>

        <Card title="Weekly Activity">
          <View style={styles.chart}>
            {chartData.map((item, index) => (
              <View key={index} style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { height: (item.value / maxValue) * 120 }
                  ]} 
                />
                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card title="Recent Activity">
          {[1, 2, 3].map((_, i) => (
            <View key={i} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Activity item {i + 1}</Text>
                <Text style={styles.activityTime}>{i + 1}h ago</Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: spacing.md,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 24,
    backgroundColor: colors.primary,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  activityContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityText: {
    fontSize: 14,
    color: colors.text,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
`;
}

function generateGenericScreen(name: string, screen: any, config: MobileAppConfig): string {
  return `import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/Card';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function ${name}Screen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card title="${screen.name}">
          <Text style={styles.description}>${screen.description}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
`;
}

function generateCardComponent(config: MobileAppConfig): string {
  return `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface CardProps {
  title?: string;
  children: React.ReactNode;
}

export default function Card({ title, children }: CardProps) {
  return (
    <View style={styles.card}>
      {title && <Text style={styles.title}>{title}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
});
`;
}

function generateButtonComponent(): string {
  return `import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  loading = false,
  disabled = false 
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return colors.disabled;
    switch (variant) {
      case 'secondary': return 'transparent';
      case 'danger': return colors.error;
      default: return colors.primary;
    }
  };

  const getTextColor = () => {
    if (variant === 'secondary') return colors.primary;
    return '#fff';
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === 'secondary' && styles.secondaryButton,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
`;
}

function generateInputComponent(): string {
  return `import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          props.multiline && styles.multiline,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={colors.placeholder}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
`;
}

function generateApiService(config: MobileAppConfig): string {
  return `const API_BASE_URL = 'https://api.example.com';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

class ApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { Authorization: \`Bearer \${this.authToken}\` } : {}),
        ...headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  put<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiService(API_BASE_URL);
export default api;
`;
}

function generateStorageService(): string {
  return `import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Storage getAllKeys error:', error);
      return [];
    }
  }
}

export const storage = new StorageService();
export default storage;
`;
}

function generateAuthService(): string {
  return `import * as SecureStore from 'expo-secure-store';
import api from './api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

class AuthService {
  private user: User | null = null;

  async login(email: string, password: string): Promise<User> {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    await this.setToken(response.token);
    this.user = response.user;
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
    return response.user;
  }

  async register(name: string, email: string, password: string): Promise<User> {
    const response = await api.post<AuthResponse>('/auth/register', { name, email, password });
    await this.setToken(response.token);
    this.user = response.user;
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
    return response.user;
  }

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    api.setAuthToken(null);
    this.user = null;
  }

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    api.setAuthToken(token);
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.user) return this.user;
    const userData = await SecureStore.getItemAsync(USER_KEY);
    if (userData) {
      this.user = JSON.parse(userData);
    }
    return this.user;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  async restoreSession(): Promise<boolean> {
    const token = await this.getToken();
    if (token) {
      api.setAuthToken(token);
      await this.getCurrentUser();
      return true;
    }
    return false;
  }
}

export const auth = new AuthService();
export default auth;
`;
}

function generateLoginScreen(): string {
  return `import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Input from '../components/Input';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useApp } from '../context/AppContext';
import auth from '../services/auth';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const { setUser } = useApp();

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      let user;
      if (isLogin) {
        user = await auth.login(email, password);
      } else {
        user = await auth.register(name, email, password);
      }
      setUser(user);
      navigation.replace('Home');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Sign in to continue' : 'Sign up to get started'}
          </Text>
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <Input
              label="Name"
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            title={isLogin ? 'Sign In' : 'Sign Up'}
            onPress={handleSubmit}
            loading={loading}
          />

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <Text style={styles.switchLink} onPress={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Sign Up' : 'Sign In'}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  switchText: {
    color: colors.textSecondary,
  },
  switchLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});
`;
}

function generateNotificationsService(): string {
  return `import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationsService {
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission for push notifications not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4a4af0',
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  }

  async scheduleLocalNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null,
    });
  }

  async scheduleDelayedNotification(title: string, body: string, seconds: number) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: { seconds },
    });
  }

  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getBadgeCount(): Promise<number> {
    return Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }
}

export const notifications = new NotificationsService();
export default notifications;
`;
}

function generateUseApiHook(): string {
  return `import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(endpoint: string): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<T>(endpoint);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export default useApi;
`;
}

function generateAppContext(config: MobileAppConfig): string {
  return `import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
${config.authentication ? "import auth from '../services/auth';" : ''}

interface User {
  id: string;
  email: string;
  name: string;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(${config.authentication ? 'true' : 'false'});

  ${config.authentication ? `
  useEffect(() => {
    const restoreSession = async () => {
      try {
        await auth.restoreSession();
        const currentUser = await auth.getCurrentUser();
        setUser(currentUser);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);` : ''}

  const value: AppContextType = {
    user,
    setUser,
    isLoading,
    isAuthenticated: !!user,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
`;
}

function generateTypes(config: MobileAppConfig): string {
  const tableTypes = (config.tables || []).map(table => {
    const fields = table.columns.map(col => {
      let tsType = 'string';
      if (col.type.includes('int') || col.type.includes('number')) tsType = 'number';
      if (col.type.includes('bool')) tsType = 'boolean';
      if (col.type.includes('date') || col.type.includes('time')) tsType = 'Date';
      return `  ${toCamelCase(col.name)}: ${tsType};`;
    }).join('\n');
    return `export interface ${toPascalCase(table.name)} {\n${fields}\n}`;
  }).join('\n\n');

  return `export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

${tableTypes}
`;
}

function generateColors(): string {
  return `export const colors = {
  primary: '#4a4af0',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  
  background: '#0f0f23',
  card: '#1e1e3c',
  text: '#e0e0e0',
  textSecondary: '#a0a0c0',
  
  border: 'rgba(100, 100, 200, 0.3)',
  inputBackground: 'rgba(20, 20, 50, 0.8)',
  placeholder: '#6b7280',
  disabled: '#4b5563',
};
`;
}

function generateSpacing(): string {
  return `export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};
`;
}

function generateTsConfig(): string {
  return JSON.stringify({
    extends: 'expo/tsconfig.base',
    compilerOptions: {
      strict: true,
      baseUrl: '.',
      paths: {
        '@/*': ['src/*'],
      },
    },
  }, null, 2);
}

function generateReadme(projectName: string, config: MobileAppConfig): string {
  return `# ${projectName}

A mobile application built with React Native and Expo for ${config.domain}.

## Features

${config.features.map(f => `- ${f}`).join('\n')}
${config.authentication ? '- User Authentication (Login/Register)\n' : ''}${config.offlineSync ? '- Offline Data Sync\n' : ''}${config.pushNotifications ? '- Push Notifications\n' : ''}

## Screens

${(config.screens || []).map(s => `- **${s.name}** (${s.type}): ${s.description}`).join('\n')}

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: \`npm install -g expo-cli\`
- Expo Go app on your phone (for testing)

### Installation

\`\`\`bash
# Install dependencies
npm install

# Start the development server
npm start
\`\`\`

### Running on Device

1. Install Expo Go on your iOS/Android device
2. Scan the QR code from the terminal
3. The app will load on your device

### Building for Production

\`\`\`bash
# Build for Android
expo build:android

# Build for iOS
expo build:ios
\`\`\`

## Project Structure

\`\`\`
├── App.tsx                 # Entry point
├── src/
│   ├── components/         # Reusable components
│   ├── screens/            # Screen components
│   ├── navigation/         # Navigation configuration
│   ├── services/           # API and other services
│   ├── hooks/              # Custom React hooks
│   ├── context/            # React Context providers
│   ├── types/              # TypeScript types
│   └── theme/              # Colors and spacing
├── assets/                 # Images and fonts
└── app.json                # Expo configuration
\`\`\`

## Configuration

Update the API base URL in \`src/services/api.ts\`:

\`\`\`typescript
const API_BASE_URL = 'https://your-api-url.com';
\`\`\`

## License

MIT
`;
}

function generateInstructions(projectName: string, config: MobileAppConfig): string {
  return `# Setup Instructions for ${projectName}

## Quick Start

1. Create a new directory and extract the files
2. Run: npm install
3. Run: npx expo start
4. Scan QR code with Expo Go app

## Requirements

- Node.js 18 or higher
- Expo CLI (npm install -g expo-cli)
- Expo Go app on your mobile device

## Building for Production

### Android APK:
npx expo build:android -t apk

### iOS (requires Apple Developer account):
npx expo build:ios

## Customization

1. Update API_BASE_URL in src/services/api.ts
2. Replace placeholder icons in assets/
3. Modify colors in src/theme/colors.ts
4. Update app.json with your app details
`;
}
