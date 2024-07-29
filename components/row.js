import styled from 'styled-components/native';

export const Row = styled.View`
    flexDirection: row;
    marginBottom: 15px;
    gap: 10px;
`;
export const Hr = styled.View`
    width: 100%;
    borderBottomWidth: 4px;
    borderColor: ${({ theme }) => theme.colors.dark.default};
    borderRadius: 30px;
    margin: 10px;
`;
