import apiClient from './api-client';
import { UserPreferences, InterfaceConfig } from '@/types/user.types';

export const getUserPreferences = async (): Promise<UserPreferences> => {
  const { data } = await apiClient.get('/user-preferences');
  return data;
};

export const updateUserPreferences = async (
  preferences: Partial<Pick<UserPreferences, 'isDarkMode' | 'interfaceConfigs'>>,
): Promise<UserPreferences> => {
  const { data } = await apiClient.put('/user-preferences', preferences);
  return data;
};

export const updateInterfaceConfig = async (
  interfaceName: string,
  config: Record<string, unknown>,
): Promise<UserPreferences> => {
  const { data } = await apiClient.patch(`/user-preferences/interface/${interfaceName}`, {
    config,
  });
  return data;
};

export const getInterfaceConfig = async (
  interfaceName: string,
): Promise<InterfaceConfig[string]> => {
  const preferences = await getUserPreferences();
  return preferences.interfaceConfigs[interfaceName];
};
